# VirtualList Hook 学习说明

本文聚焦 3 个核心 Hook 的功能、组织逻辑，以及背后的原生 API 与设计思想，帮助你建立可迁移的 Hook 思维模型。

## 1. Hook 分层设计

在这个案例里，推荐把职责切成三层：

1. 数据层 Hook：负责分页请求和并发控制
2. 视图层 Hook：负责虚拟布局与可视区裁剪
3. 交互层 Hook：负责滚动状态、尺寸监听、触底触发

对应文件：

- [src/pages/VirtualList/hooks/useVirtualWaterfallData.js](src/pages/VirtualList/hooks/useVirtualWaterfallData.js)
- [src/pages/VirtualList/hooks/useVirtualMasonryLayout.js](src/pages/VirtualList/hooks/useVirtualMasonryLayout.js)
- [src/pages/VirtualList/hooks/useScrollLoader.js](src/pages/VirtualList/hooks/useScrollLoader.js)

这种拆分的好处是：

1. 单一职责，调试时更容易定位问题
2. 可以独立替换，例如把本地模拟请求替换成真实接口
3. Hook 可复用，不绑死 UI 组件结构

## 2. 各 Hook 的功能与组织逻辑

## 2.1 useVirtualWaterfallData

目标：提供 items、loadMore、hasMore、isLoading。

关键变量：

1. items：当前已加载的全部数据
2. loading：正在请求时为 true
3. hasMore：是否还有下一页
4. pageRef：当前页码（ref，避免异步 setState 带来的旧值问题）
5. lockRef：并发锁，防止重复请求
6. mountedRef：组件卸载保护，避免卸载后 setState

关键方法：

1. fetchPageData(pageNum)：请求或模拟请求某一页
2. loadPage(pageNum, mode)：统一处理 replace/append
3. loadMore()：只做页码推进，真正请求逻辑都走 loadPage

组织逻辑：

1. 首次 useEffect 拉首屏
2. 滚动接近底部时调用 loadMore
3. loadMore 内部走 lockRef，确保单次请求串行

## 2.2 useScrollLoader

目标：管理滚动容器状态并在接近底部时触发加载。

关键变量：

1. scrollTop：滚动条距离顶部的像素
2. viewportHeight：容器可视高度
3. viewportWidth：容器可视宽度
4. onLoadMoreRef/hasMoreRef/isLoadingRef：保存最新值，防止闭包陈旧
5. tickingRef：requestAnimationFrame 节流锁

关键方法：

1. syncViewportSize()：读取容器尺寸
2. handleScroll()：读滚动状态，计算距离底部，判断是否触发加载

组织逻辑：

1. 绑定 scroll 事件
2. 绑定 ResizeObserver，容器尺寸变化时同步状态
3. 首次挂载主动执行一次 handleScroll，避免内容不满一屏时无法继续加载

## 2.3 useVirtualMasonryLayout

目标：把不定高瀑布流转成可虚拟渲染的数据。

关键变量：

1. heightsRef：记录每个卡片的真实高度
2. version：高度回填后触发布局重算
3. positionedItems：包含 top/left/width/height 的定位结果
4. totalHeight：虚拟容器总高度
5. visibleItems：裁剪后的渲染子集

关键方法：

1. findShortestColumn()：找最短列，完成瀑布流分配
2. registerMeasure(id)：给每个卡片绑定测量回调

组织逻辑：

1. 先用 estimatedItemHeight 计算首轮布局
2. 卡片渲染后通过 getBoundingClientRect 回填真实高度
3. 高度变化触发 version 更新，再算第二轮更准确布局
4. 只返回 visibleItems 给页面渲染

## 3. 关键背景知识

## 3.1 scrollTop

定义：滚动容器内容顶部到可视窗口顶部的偏移量（像素）。

常见用途：

1. 计算可视区范围
2. 判断是否接近底部
3. 做吸顶、回到顶部、滚动联动

## 3.2 viewportHeight

定义：容器的 clientHeight，表示当前可视高度。

常见用途：

1. 与 scrollTop 一起确定可视窗口上下边界
2. 计算触底阈值

## 3.3 overscan

定义：可视区上下的额外缓冲区（像素）。

如果可视区是 [start, end]，虚拟渲染会扩成 [start - overscan, end + overscan]。

意义：

1. 减少快速滚动时白屏
2. 减少元素频繁挂载/卸载

副作用：

1. overscan 太大：渲染量上升
2. overscan 太小：滚动时闪烁风险升高

## 3.4 getBoundingClientRect

用途：拿到元素在视口中的真实渲染几何信息。

常用属性：

1. height：真实高度（可以有小数）
2. width：真实宽度
3. top/left：元素相对视口的位置

在不定高虚拟列表里，重点是用它测量真实高度，修正预估误差。

## 3.5 ResizeObserver

用途：监听元素尺寸变化。

在本案例中：

1. 容器宽度变化时重新计算列宽
2. 容器高度变化时更新 viewportHeight

## 4. 为什么用这些 Hook 和 API

1. 用 useRef 保存最新状态：解决高频回调中的闭包过期问题
2. 用 useMemo 做布局计算：减少不必要重算
3. 用 useCallback 固定函数引用：避免事件解绑失败或子组件重复渲染
4. 用 requestAnimationFrame：把滚动计算对齐到浏览器绘制节奏

## 5. 不定高虚拟列表设计哲学

核心思想不是一次算准，而是分两阶段逼近：

1. 先可用：用估算高度快速给出布局
2. 再精确：渲染后测量真实高度并增量修正

这是一种工程上常见的策略：

1. 优先响应速度，保证首屏体验
2. 允许误差存在，但快速纠偏
3. 通过局部更新降低整体成本

## 6. 你该怎么练（推荐顺序）

1. 先用 [src/pages/VirtualList/myHooks/useScrollLoader.js](src/pages/VirtualList/myHooks/useScrollLoader.js) 补完容器滚动逻辑
2. 再补 [src/pages/VirtualList/myHooks/useVirtualWaterfallData.js](src/pages/VirtualList/myHooks/useVirtualWaterfallData.js) 的分页串行加载
3. 最后补 [src/pages/VirtualList/myHooks/useVirtualMasonryLayout.js](src/pages/VirtualList/myHooks/useVirtualMasonryLayout.js) 的不定高布局与裁剪
4. 每完成一步，打印 scrollTop、visibleItems.length、totalHeight，观察变化

## 7. 学习版骨架说明

为了方便你自己填空练习，骨架代码放在：

- [src/pages/VirtualList/myHooks/useScrollLoader.js](src/pages/VirtualList/myHooks/useScrollLoader.js)
- [src/pages/VirtualList/myHooks/useVirtualWaterfallData.js](src/pages/VirtualList/myHooks/useVirtualWaterfallData.js)
- [src/pages/VirtualList/myHooks/useVirtualMasonryLayout.js](src/pages/VirtualList/myHooks/useVirtualMasonryLayout.js)

它们保留了关键状态、关键方法签名和 TODO 位置，你可以按步骤逐步补全。
