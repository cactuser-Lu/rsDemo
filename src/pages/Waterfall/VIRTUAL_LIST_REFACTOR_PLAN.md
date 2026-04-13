# 瀑布流改造成虚拟列表的实现方案

> 目标：把当前基于 `column-count` 的瀑布流，改造成“可上下滚动、支持不定高卡片、先预估高度再真实修正”的虚拟列表版本。
>
> 说明：本文是改造思路 + 代码骨架，不直接修改现有源码。你可以先按文档理解，再逐步落地。

---

## 1. 为什么要改造

当前瀑布流基于 CSS 的 `column-count` 自动分列，这种方式适合展示，但不适合虚拟列表，原因是：

1. 卡片的位置由浏览器自动排版，React 很难精确知道每个卡片的 `top / left`。
2. 卡片高度不固定时，无法稳定计算总高度和可视区范围。
3. 虚拟列表需要“只渲染可见区域”，而 `column-count` 更像“把所有内容一次性交给浏览器处理”。

所以，改造成虚拟列表的核心是：

- 布局由 React 控制
- 高度先预估，再测量修正
- 只渲染可视区域内的卡片
- 上下滚动都用同一套计算逻辑

---

## 2. 总体设计

建议把改造拆成 4 层：

1. 数据层：负责拿到完整 `items`。
2. 布局层：根据 item 高度，计算每个 item 的位置。
3. 虚拟层：根据 `scrollTop` 计算当前可见范围。
4. 测量层：渲染后用 DOM 真实高度修正布局。

可以把它理解成一个循环：

1. 先预估
2. 再渲染
3. 再测量
4. 再修正
5. 再只保留可见区

---

## 3. 推荐的数据结构

为了让虚拟列表能跑起来，建议准备这些状态或缓存。

```js
const [items, setItems] = useState([]);
const [scrollTop, setScrollTop] = useState(0);
const [viewportHeight, setViewportHeight] = useState(0);
const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
const [containerHeight, setContainerHeight] = useState(0);
```

再配合这些 `ref`：

```js
const scrollRef = useRef(null);
const itemRefs = useRef(new Map());
const heightMapRef = useRef(new Map());
const positionMapRef = useRef(new Map());
const columnsRef = useRef([0, 0]);
```

这些变量分别负责：

- `items`：原始数据
- `scrollTop`：当前滚动位置
- `viewportHeight`：视口高度
- `visibleRange`：当前该渲染哪些 item
- `containerHeight`：总高度，用来撑开滚动条
- `itemRefs`：拿到每个卡片 DOM
- `heightMapRef`：缓存真实或预估高度
- `positionMapRef`：缓存每个 item 的位置
- `columnsRef`：双列累计高度

---

## 4. 改造思路一：先去掉 column-count

如果继续依赖 `column-count`，虚拟化会非常难做，因为你没法稳定控制每个卡片的位置。

更推荐改成“React 手动控制双列瀑布流”：

1. 外层容器使用 `position: relative`。
2. 每个卡片使用 `position: absolute`。
3. 每个卡片的 `top / left / width / height` 都由你计算。

示例结构如下：

```jsx
<div className="waterfall-wrapper" style={{ height: containerHeight }}>
  {visibleItems.map((item) => (
    <div
      key={item.id}
      ref={(node) => {
        if (node) itemRefs.current.set(item.id, node);
      }}
      className="card"
      style={{
        position: "absolute",
        top: item.top,
        left: item.left,
        width: item.width,
      }}
    >
      <div className="card-title">{item.title}</div>
      <div className="card-content">{item.content}</div>
    </div>
  ))}
</div>
```

这样你才能明确知道：

- 卡片放在哪一列
- 卡片距离顶部多少
- 哪些卡片在可视区内

---

## 5. 改造思路二：先预估高度

因为卡片内容不定高，不能等真实高度出来以后才布局，否则初始滚动条会不准确。

所以每个 item 先给一个估算高度，比如：

```js
function estimateHeight(item) {
  const base = 120;
  const contentLength = item.content.length;
  if (contentLength < 60) return base;
  if (contentLength < 120) return base + 60;
  return base + 120;
}
```

也可以按内容长度、图片数量、标题长度等做更合理的估算。

### 预估的作用

1. 先把滚动条撑起来。
2. 先算出 item 大概在哪个位置。
3. 首屏不需要等真实测量结果。

### 真实高度修正

当 DOM 渲染后，再读取真实高度：

```js
const realHeight = node.getBoundingClientRect().height;
```

如果真实高度和预估差异较大，就更新 `heightMapRef`，然后重新算 position。

---

## 6. 改造思路三：双列布局计算

如果你想保留“瀑布流”的视觉效果，建议不要做纯单列虚拟列表，而是做“手动双列分配”。

### 核心规则

1. 维护左列累计高度。
2. 维护右列累计高度。
3. 新 item 放到当前更短的那一列。
4. 记录该 item 的位置。

### 示例计算函数

```js
function buildWaterfallLayout(items, columnCount = 2, columnGap = 20, containerWidth = 1200) {
  const columnWidth = (containerWidth - columnGap) / columnCount;
  const columns = new Array(columnCount).fill(0);
  const layout = [];

  items.forEach((item) => {
    const height = item.height || estimateHeight(item);
    const targetColumn = columns[0] <= columns[1] ? 0 : 1;
    const top = columns[targetColumn];
    const left = targetColumn * (columnWidth + columnGap);

    layout.push({
      ...item,
      top,
      left,
      width: columnWidth,
      height,
    });

    columns[targetColumn] += height + columnGap;
  });

  return {
    layout,
    totalHeight: Math.max(...columns),
  };
}
```

### 这个函数的作用

- 决定 item 放左列还是右列
- 计算 item 的绝对位置
- 返回总高度，用来撑开外层容器

---

## 7. 改造思路四：计算可视区

虚拟列表最关键的是：根据滚动位置决定渲染哪些 item。

### 基本思路

1. 获取 `scrollTop`。
2. 获取 `viewportHeight`。
3. 预留一个缓冲区 `overscan`。
4. 找到当前应该显示的起止索引。

### 示例

```js
function getVisibleRange(layout, scrollTop, viewportHeight, overscan = 300) {
  const start = scrollTop - overscan;
  const end = scrollTop + viewportHeight + overscan;

  let startIndex = 0;
  let endIndex = layout.length - 1;

  for (let i = 0; i < layout.length; i++) {
    if (layout[i].top + layout[i].height >= start) {
      startIndex = i;
      break;
    }
  }

  for (let i = startIndex; i < layout.length; i++) {
    if (layout[i].top > end) {
      endIndex = i;
      break;
    }
  }

  return { startIndex, endIndex };
}
```

### 这个范围函数的意义

- 向下滚动时，提前渲染一点，避免白屏
- 向上滚动时，同样重新计算范围
- 不需要针对上滑、下滑分别写逻辑

---

## 8. 改造思路五：真实测量后修正布局

因为你是“先预估再修正”，所以渲染完成后一定要测量真实高度。

### 可以用两种方式

1. `ref + getBoundingClientRect()`
2. `ResizeObserver`

如果你只是练 React，先用 `ref` 就够了。

### 示例测量逻辑

```js
useEffect(() => {
  visibleItems.forEach((item) => {
    const node = itemRefs.current.get(item.id);
    if (!node) return;

    const realHeight = node.getBoundingClientRect().height;
    const cachedHeight = heightMapRef.current.get(item.id);

    if (cachedHeight !== realHeight) {
      heightMapRef.current.set(item.id, realHeight);
      // 这里需要重新计算布局和 totalHeight
    }
  });
}, [visibleItems]);
```

### 修正时要注意

1. 高度变化会影响后面所有 item 的位置。
2. 不能只改一个卡片的高度，必须重新计算后续布局。
3. 如果视觉上出现跳动，要做锚点修正。

---

## 9. 改造思路六：滚动锚点修正

因为高度是预估的，不是绝对准确，所以当真实高度修正后，滚动位置可能会抖动。

### 典型问题

- 页面突然上跳
- 列表内容错位
- 上滑时感觉滚动不连续

### 解决办法

1. 记录当前视口顶部附近的 item 作为锚点。
2. 修正布局后，计算锚点前的累计高度变化。
3. 用 `scrollTo` 把滚动位置拉回去。

### 伪代码

```js
function adjustScrollByAnchor(anchorId, oldLayout, newLayout) {
  const oldTop = oldLayout.find((item) => item.id === anchorId)?.top || 0;
  const newTop = newLayout.find((item) => item.id === anchorId)?.top || 0;
  const delta = newTop - oldTop;

  window.scrollTo({
    top: window.scrollY + delta,
  });
}
```

这个步骤是进阶点，但很值得练。

---

## 10. 建议拆分的 Hook

如果你要把它写成一个适合练习的 React Demo，可以拆成这几个 Hook。

### 10.1 useVirtualWaterfallData

负责：

- 拉取数据
- 分页
- 加载更多
- 首屏初始化

返回：

```js
{
  items,
  loadMore,
  hasMore,
  isLoading
}
```

### 10.2 useWaterfallLayout

负责：

- 根据 items 计算布局
- 根据高度缓存更新位置
- 计算总高度

返回：

```js
{
  layout,
  containerHeight,
  recomputeLayout
}
```

### 10.3 useVisibleRange

负责：

- 监听滚动
- 根据 scrollTop 和 viewportHeight 计算可视范围

返回：

```js
{
  visibleRange,
  onScroll
}
```

### 10.4 useMeasureHeight

负责：

- 获取 DOM
- 测量真实高度
- 写回高度缓存

### 10.5 useScrollAnchor

负责：

- 记录锚点
- 修正跳动
- 保持上下滚动稳定

---

## 11. 一个完整的组件骨架

下面这个例子展示的是改造后的结构，不是最终完整代码，但足够让你理解组件怎么组织。

```jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

function VirtualWaterfall({ items }) {
  const scrollRef = useRef(null);
  const itemRefs = useRef(new Map());
  const heightMapRef = useRef(new Map());
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const layout = useMemo(() => {
    return buildWaterfallLayout(items.map((item) => ({
      ...item,
      height: heightMapRef.current.get(item.id),
    })));
  }, [items]);

  const visibleRange = useMemo(() => {
    return getVisibleRange(layout.layout, scrollTop, viewportHeight);
  }, [layout, scrollTop, viewportHeight]);

  const visibleItems = layout.layout.slice(
    visibleRange.startIndex,
    visibleRange.endIndex + 1,
  );

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    const handleScroll = () => {
      setScrollTop(node.scrollTop);
      setViewportHeight(node.clientHeight);
    };

    handleScroll();
    node.addEventListener("scroll", handleScroll);
    return () => node.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div ref={scrollRef} style={{ height: "100vh", overflow: "auto" }}>
      <div style={{ position: "relative", height: layout.totalHeight }}>
        {visibleItems.map((item) => (
          <div
            key={item.id}
            ref={(node) => {
              if (node) itemRefs.current.set(item.id, node);
            }}
            style={{
              position: "absolute",
              top: item.top,
              left: item.left,
              width: item.width,
            }}
          >
            {item.title}
          </div>
        ))}
      </div>
    </div>
  );
}
```

这个骨架体现了三个核心点：

1. 数据和布局分离。
2. 可视范围和完整数据分离。
3. DOM 测量和渲染逻辑分离。

---

## 12. 实战建议：先做简化版，再做进阶版

不要一上来就做最复杂的版本。建议按这个顺序：

### 第一阶段：单列虚拟列表

- 先不做瀑布流
- 只做单列
- 跑通预估高度、测量、可视范围计算

### 第二阶段：双列瀑布流

- 再加入手动双列分配
- 再算 left / top

### 第三阶段：高度修正

- 加真实测量
- 修正缓存高度

### 第四阶段：锚点修正

- 解决滚动跳动
- 让上下滚动更平滑

---

## 13. 你会学到哪些 React 能力

这个改造能帮你练到：

1. `useState`：管理滚动、范围、布局结果。
2. `useRef`：缓存 DOM、缓存高度、缓存位置。
3. `useEffect`：监听滚动、测量 DOM、初始化视口。
4. `useMemo`：计算布局、计算可视范围。
5. `useCallback`：稳定滚动处理、稳定测量回调。
6. `memo`：减少可见卡片重复渲染。

---

## 14. 最后给你的落地顺序

如果你准备真的动手写，建议按下面顺序来：

1. 把 `column-count` 方案换成绝对定位容器。
2. 先做双列手动分配。
3. 加入预估高度。
4. 加入真实测量。
5. 加入可视区计算。
6. 加入上下滚动回收。
7. 最后做锚点修正。

---

## 15. 总结

虚拟列表的本质不是“少渲染”，而是“用计算换 DOM”。

对于你的瀑布流场景，最关键的变化是：

- 布局由 React 控制
- 高度先预估，再修正
- 只渲染可视区
- 上下滚动统一处理

如果你愿意，我下一步可以继续给你补一份更偏“代码实现顺序”的文档，把每一步要写哪些 state、哪些 ref、哪些 Hook、哪些函数都列成开发任务清单。
