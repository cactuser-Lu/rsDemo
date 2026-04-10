# Waterfall Demo 深入讲解（Hook 组织 + 数据流 + 依赖项）

## 1. 先看目标与分层

这个 Demo 拆成两层 Hook：

- `useMockData`：只负责数据获取和分页状态（items、loading、hasMore）
- `useScrollLoader`：只负责滚动检测与触发加载时机

这样做的核心价值：

- 单一职责，调试成本低
- 每个 Hook 的依赖更容易写正确
- 组合后仍然清楚：页面层只做“接线”

---

## 2. 整体数据流链路（从滚动到渲染）

1. 用户滚动页面
2. `useScrollLoader` 的 `scroll` 监听触发
3. 距离底部小于阈值（offset）时，调用 `onLoadMore`
4. `onLoadMore` 实际是 `useMockData` 暴露的 `loadMore`
5. `loadMore` 进入 `loadPage`
6. `loadPage` 通过 `lockRef` 防止并发重复请求
7. 拉取 mock 分页数据，更新 `items / hasMore / loading`
8. 组件重渲染，瀑布流卡片新增
9. 如果 `hasMore === false`，显示“已经到底了”

这个链路里最关键的是：

- 触发条件在滚动 Hook
- 并发保护在数据 Hook
- 渲染判断在页面组件

职责边界清晰，所以后面替换成真实 API 也很顺。

---

## 3. 为什么这些地方用 useRef

### 3.1 `useScrollLoader` 里的 Ref

- `onLoadMoreRef`
- `hasMoreRef`
- `isLoadingRef`
- `tickingRef`

用途分别是：

- 前三个：让事件监听函数拿到“最新值”，避免闭包拿到旧状态
- `tickingRef`：基于 `requestAnimationFrame` 做轻量节流，避免滚动回调过密

为什么不把 `hasMore/isLoading/onLoadMore` 全放进 `handleScroll` 依赖里？

可以，但会导致 `handleScroll` 频繁重建，`useEffect` 重复解绑/绑定监听。对于高频滚动场景，用 Ref 承载“最新状态”更稳，也更省。

### 3.2 `useMockData` 里的 Ref

- `pageRef`：保存当前页游标，不依赖异步 state 立即生效
- `lockRef`：请求锁，防止重复并发
- `mountedRef`：组件卸载后阻止 setState（避免内存泄漏告警）

这里 `lockRef` 比单纯依赖 `loading` 更可靠：

- `loading` 是异步更新
- 在极短时间内触发多次时，可能出现“还没来得及变 true”就进入第二次请求
- `lockRef.current` 是同步可变值，立即生效

---

## 4. useCallback 的依赖项怎么想

### 4.1 `fetchPageData`

依赖只有 `pageSize`，因为函数只用到了它。

这是正确最小依赖。

### 4.2 `loadPage`

依赖 `fetchPageData`，因为它内部调用了该函数。

`lockRef/pageRef/mountedRef` 不需要进依赖：

- Ref 对象本身是稳定引用
- 读取的是 `.current`

### 4.3 `loadMore`

依赖 `hasMore` 和 `loadPage`：

- `hasMore` 决定是否允许请求
- `loadPage` 是它的直接调用项

这样能保证逻辑正确且不漏更新。

---

## 5. useEffect 的依赖项怎么想

### 5.1 监听滚动的 Effect

依赖 `handleScroll`。

因为真正绑定的是这个函数引用，引用变了就应该重绑。现在 `handleScroll` 只依赖 `offset`，通常稳定，所以不会频繁重绑。

### 5.2 首次拉取第一页的 Effect

依赖 `initialPage` 和 `loadPage`。

这是“可解释、可维护”的写法：

- 如果将来 `initialPage` 可变（比如路由参数），Effect 能正确响应
- 不依赖空数组+人为忽略 eslint

---

## 6. 什么时候需要 useMemo

当前场景不需要强行上 `useMemo`。

原则：

- 只有“计算昂贵”或“需要稳定引用传给子组件避免重复渲染”才用
- 当前只是 map 渲染卡片、拼接数组，开销不大

如果后续做这些再考虑：

- 大量卡片的复杂排序/分组
- 富文本预处理
- 重计算布局数据

---

## 7. 当前实现的关键改进点

1. 修复了“初始就显示到底”的体验问题（`hasMore` 初始为 `true`，且 no-more 需 `items.length > 0`）
2. 加入同步请求锁 `lockRef`，防止重复请求
3. 加入 `mountedRef`，避免卸载后 setState
4. 滚动监听改为 Ref 驱动，避免闭包旧值问题
5. 滚动处理用 `requestAnimationFrame` 节流，减少高频抖动
6. 初次挂载主动触发一次检查，内容过短也能继续加载

---

## 8. 你可以复用的思考模板

以后你自己写类似 Demo，可以按这个模板：

1. 先切职责：触发层（滚动/交互） vs 数据层（请求/分页）
2. 数据层先做并发保护（锁）再做状态管理
3. 高频事件里优先考虑 Ref + 稳定回调
4. 每个 Hook 对外只暴露最小接口
5. 所有 Effect 和 Callback 都按“使用了谁就依赖谁”推导
6. 最后再做体验优化（阈值、节流、空态、到底提示）

---

## 9. 一句话总结

这个 Demo 的本质不是“瀑布流样式”，而是“把高频事件触发 + 异步分页状态”拆成两个可组合 Hook，并通过正确依赖和 Ref 管理闭包与并发。
