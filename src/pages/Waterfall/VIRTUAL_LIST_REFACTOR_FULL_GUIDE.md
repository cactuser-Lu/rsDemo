# 瀑布流改造成虚拟列表：完整改造指南

> 目标：把当前基于 `column-count` 的瀑布流，改造成一个支持不定高卡片、可上下滚动、先预估高度再真实修正的虚拟列表版本。  
> 说明：本文只提供完整方案和参考实现，不直接修改现有源码。你可以按步骤逐步替换。

---

## 1. 现状与最终目标

你现在的瀑布流实现适合做展示，但不适合虚拟列表，原因有三点：

1. `column-count` 的位置由浏览器自动排版，React 无法精确控制。
2. 卡片高度不固定时，无法稳定计算总高度和可视区。
3. 虚拟列表需要“只渲染可见区域”，而不是把所有节点一次性挂载。

最终目标是：

- 页面高度变得可控
- 卡片只渲染当前可视区
- 卡片不定高，但可以先预估、后修正
- 支持向下滚动和向上滚动
- 代码结构适合练 React 的 Hook 组织方式

---

## 2. 最终效果的整体思路

推荐把整个实现分成 5 层：

1. 数据层：负责加载完整 items。
2. 预估层：给每个 item 一个初始高度。
3. 布局层：根据高度计算每个 item 的 top / left / width。
4. 虚拟层：根据 scrollTop 计算当前可见范围。
5. 测量层：渲染后测真实高度，修正布局。

这套流程本质上是：

1. 先预估
2. 再渲染
3. 再测量
4. 再修正
5. 再只保留可视区

---

## 3. 先看最终组件结构

最终建议的结构不是一个大组件，而是多个 Hook 组合：

```jsx
<WaterfallVirtualDemo />
  ├─ useVirtualWaterfallData
  ├─ useWaterfallLayout
  ├─ useVisibleRange
  ├─ useMeasureHeight
  └─ useScrollAnchor
```

每个 Hook 只做一件事：

- `useVirtualWaterfallData`：请求数据和分页
- `useWaterfallLayout`：算布局
- `useVisibleRange`：算可视区
- `useMeasureHeight`：测量真实高度
- `useScrollAnchor`：修正滚动跳动

---

## 4. 第一步：定义数据结构

先不要急着写组件，先把数据结构定清楚。

### 4.1 原始数据 item

```js
{
  id: 1,
  title: "卡片 1",
  content: "...",
}
```

### 4.2 布局后的 item

布局计算后，item 需要带上位置和高度：

```js
{
  id: 1,
  title: "卡片 1",
  content: "...",
  top: 0,
  left: 0,
  width: 360,
  height: 180,
}
```

### 4.3 布局缓存

```js
const heightMapRef = useRef(new Map());
const positionMapRef = useRef(new Map());
const itemRefs = useRef(new Map());
```

用途：

- `heightMapRef`：记录 item 的真实高度或预估高度
- `positionMapRef`：记录 item 的 top / left / width / height
- `itemRefs`：记录 item 的 DOM 节点

---

## 5. 第二步：写一个预估高度函数

卡片不定高，所以不能等真实高度出来再算总高度。你必须先给一个估算值。

```js
function estimateHeight(item) {
  const base = 120;
  const contentLength = item.content.length;

  if (contentLength < 40) return base;
  if (contentLength < 80) return base + 40;
  if (contentLength < 120) return base + 80;
  return base + 120;
}
```

### 这一步的作用

- 先撑开滚动条
- 先能计算 item 大概位置
- 首屏不用等测量完成

---

## 6. 第三步：实现双列瀑布布局计算

如果你想保留“瀑布流”的视觉效果，推荐不要再用 `column-count`，而是用 React 自己计算双列位置。

### 6.1 布局计算函数

```js
function buildWaterfallLayout(items, options) {
  const {
    columnCount = 2,
    columnGap = 20,
    containerWidth = 1200,
    heightMap = new Map(),
  } = options;

  const columnWidth = (containerWidth - columnGap * (columnCount - 1)) / columnCount;
  const columns = new Array(columnCount).fill(0);
  const layout = [];

  items.forEach((item) => {
    const cachedHeight = heightMap.get(item.id);
    const height = cachedHeight || estimateHeight(item);
    const targetColumn = columns[0] <= columns[1] ? 0 : 1;
    const top = columns[targetColumn];
    const left = targetColumn * (columnWidth + columnGap);

    layout.push({
      ...item,
      top,
      left,
      width: columnWidth,
      height,
      columnIndex: targetColumn,
    });

    columns[targetColumn] += height + columnGap;
  });

  return {
    layout,
    totalHeight: Math.max(...columns),
    columnWidth,
  };
}
```

### 6.2 这一步怎么理解

- 哪一列更短，新 item 就放哪一列
- 每个 item 都有自己的绝对位置
- `totalHeight` 用来撑开整个滚动容器

---

## 7. 第四步：计算可视范围

虚拟列表的核心是：只渲染当前看得见的 item。

### 7.1 可视范围计算函数

```js
function getVisibleRange(layout, scrollTop, viewportHeight, overscan = 300) {
  const startBoundary = Math.max(0, scrollTop - overscan);
  const endBoundary = scrollTop + viewportHeight + overscan;

  let startIndex = 0;
  let endIndex = layout.length - 1;

  for (let i = 0; i < layout.length; i++) {
    const item = layout[i];
    if (item.top + item.height >= startBoundary) {
      startIndex = i;
      break;
    }
  }

  for (let i = startIndex; i < layout.length; i++) {
    const item = layout[i];
    if (item.top > endBoundary) {
      endIndex = i;
      break;
    }
  }

  return { startIndex, endIndex };
}
```

### 7.2 这一步怎么理解

- `scrollTop` 是当前滚动位置
- `viewportHeight` 是可视高度
- `overscan` 是缓冲区，用来避免滚动时白屏
- 不管向上还是向下滚动，都用同一套计算逻辑

---

## 8. 第五步：实现数据加载 Hook

你当前的瀑布流已经有分页加载逻辑，这部分可以保留，只是要把它整理得更适合虚拟列表。

### 8.1 数据 Hook 的职责

- 首屏加载第一页
- 加载下一页
- 防止重复请求
- 返回 items、hasMore、loading

### 8.2 完整实现

```js
import { useCallback, useEffect, useRef, useState } from "react";

function useVirtualWaterfallData(initialPage = 1, pageSize = 10) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(initialPage - 1);
  const lockRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchPageData = useCallback(async (pageNum) => {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const startId = (pageNum - 1) * pageSize;
    const newItems = Array.from({ length: pageSize }, (_, i) => ({
      id: startId + i + 1,
      title: `卡片 ${startId + i + 1}`,
      content: getRandomContent(),
    }));

    const totalPages = 5;
    return {
      newItems,
      nextHasMore: pageNum < totalPages,
    };
  }, [pageSize]);

  const loadPage = useCallback(async (pageNum, mode = "append") => {
    if (lockRef.current) return;

    lockRef.current = true;
    setLoading(true);

    try {
      const { newItems, nextHasMore } = await fetchPageData(pageNum);
      if (!mountedRef.current) return;

      setItems((prev) =>
        mode === "replace" ? newItems : [...prev, ...newItems],
      );
      setHasMore(nextHasMore);
      pageRef.current = pageNum;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      lockRef.current = false;
    }
  }, [fetchPageData]);

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    loadPage(pageRef.current + 1, "append");
  }, [hasMore, loadPage]);

  useEffect(() => {
    loadPage(initialPage, "replace");
  }, [initialPage, loadPage]);

  return {
    items,
    loadMore,
    hasMore,
    isLoading: loading,
  };
}
```

---

## 9. 第六步：实现滚动监听 Hook

虚拟列表里，滚动监听不要直接塞在组件里，应该抽成独立 Hook。

### 9.1 滚动监听职责

- 监听 scroll
- 用 requestAnimationFrame 节流
- 判断是否触底加载
- 更新 scrollTop

### 9.2 完整实现

```js
import { useCallback, useEffect, useRef, useState } from "react";

function useScrollLoader(onLoadMore, hasMore, isLoading, offset = 100) {
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const onLoadMoreRef = useRef(onLoadMore);
  const hasMoreRef = useRef(hasMore);
  const isLoadingRef = useRef(isLoading);
  const tickingRef = useRef(false);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  const handleScroll = useCallback(() => {
    if (tickingRef.current) return;
    tickingRef.current = true;

    window.requestAnimationFrame(() => {
      tickingRef.current = false;

      const nextScrollTop = window.scrollY || document.documentElement.scrollTop;
      const nextViewportHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      setScrollTop(nextScrollTop);
      setViewportHeight(nextViewportHeight);

      if (!hasMoreRef.current || isLoadingRef.current) return;

      if (nextScrollTop + nextViewportHeight + offset >= documentHeight) {
        onLoadMoreRef.current();
      }
    });
  }, [offset]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return { scrollTop, viewportHeight };
}
```

---

## 10. 第七步：实现测量高度 Hook

因为卡片内容不定高，所以必须在 DOM 渲染后测量真实高度。

### 10.1 这个 Hook 的职责

- 接收当前可见的 layout
- 通过 ref 找到 DOM
- 读取真实高度
- 写回 heightMap
- 通知外部重新计算布局

### 10.2 完整实现

```js
import { useEffect } from "react";

function useMeasureHeight(visibleItems, itemRefs, heightMapRef, onHeightChange) {
  useEffect(() => {
    let hasChanged = false;

    visibleItems.forEach((item) => {
      const node = itemRefs.current.get(item.id);
      if (!node) return;

      const realHeight = node.getBoundingClientRect().height;
      const cachedHeight = heightMapRef.current.get(item.id);

      if (cachedHeight !== realHeight) {
        heightMapRef.current.set(item.id, realHeight);
        hasChanged = true;
      }
    });

    if (hasChanged) {
      onHeightChange?.();
    }
  }, [visibleItems, itemRefs, heightMapRef, onHeightChange]);
}
```

### 10.3 这一步怎么理解

- 渲染后 DOM 才存在
- 渲染后才可以测量真实高度
- 真实高度变化后，要重新计算布局

---

## 11. 第八步：实现虚拟布局 Hook

这个 Hook 负责把 items 变成可渲染的布局结果。

### 11.1 Hook 职责

- 计算 layout
- 计算 totalHeight
- 根据 scrollTop 和 viewportHeight 计算 visibleRange
- 返回 visibleItems

### 11.2 完整实现

```js
import { useMemo } from "react";

function useWaterfallLayout(items, scrollTop, viewportHeight, heightMapRef, containerWidth = 1200) {
  const layoutData = useMemo(() => {
    return buildWaterfallLayout(items, {
      columnCount: 2,
      columnGap: 20,
      containerWidth,
      heightMap: heightMapRef.current,
    });
  }, [items, containerWidth, heightMapRef]);

  const visibleRange = useMemo(() => {
    return getVisibleRange(
      layoutData.layout,
      scrollTop,
      viewportHeight,
      300,
    );
  }, [layoutData, scrollTop, viewportHeight]);

  const visibleItems = layoutData.layout.slice(
    visibleRange.startIndex,
    visibleRange.endIndex + 1,
  );

  return {
    layout: layoutData.layout,
    visibleItems,
    totalHeight: layoutData.totalHeight,
    columnWidth: layoutData.columnWidth,
  };
}
```

---

## 12. 第九步：最终页面组件

把上面的 Hook 串起来，最终组件会非常清晰。

### 12.1 完整示例

```jsx
import React, { useCallback, useRef } from "react";

export default function WaterfallVirtualDemo() {
  const itemRefs = useRef(new Map());
  const heightMapRef = useRef(new Map());

  const {
    items,
    loadMore,
    hasMore,
    isLoading,
  } = useVirtualWaterfallData();

  const { scrollTop, viewportHeight } = useScrollLoader(
    loadMore,
    hasMore,
    isLoading,
  );

  const forceRerender = useCallback(() => {
    // 这里可以触发一次重新布局，比如用一个 version state
  }, []);

  const {
    visibleItems,
    totalHeight,
    columnWidth,
  } = useWaterfallLayout(
    items,
    scrollTop,
    viewportHeight,
    heightMapRef,
    1200,
  );

  useMeasureHeight(
    visibleItems,
    itemRefs,
    heightMapRef,
    forceRerender,
  );

  return (
    <div className="app">
      <header className="header">
        <h1>瀑布流 · 虚拟列表版</h1>
        <p>支持不定高卡片、上下滚动、预估高度修正</p>
      </header>

      <div
        className="waterfall-wrapper"
        style={{
          position: "relative",
          height: totalHeight,
        }}
      >
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
              width: columnWidth,
            }}
          >
            <div className="card-title">{item.title}</div>
            <div className="card-content">{item.content}</div>
          </div>
        ))}
      </div>

      {isLoading && <div className="loading">加载中...</div>}
      {!hasMore && items.length > 0 && (
        <div className="no-more">—— 已经到底了 ——</div>
      )}
    </div>
  );
}
```

---

## 13. 第十步：锚点修正思路

因为卡片不定高，真实测量后会导致后续 item 的 top 变化，所以滚动可能会抖动。

### 13.1 什么时候需要锚点修正

- 预估高度和真实高度差异较大
- 滚动到中间时布局重新计算
- 上下滚动出现突然跳动

### 13.2 简化版修正逻辑

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

这个步骤可以放到进阶版再实现。

---

## 14. 完整工具函数

下面把前面用到的工具函数汇总一下，方便你直接复制到一个独立文件里理解。

### 14.1 随机文本函数

```js
function getRandomContent() {
  const lengths = [30, 60, 90, 120, 150, 200];
  const len = lengths[Math.floor(Math.random() * lengths.length)];
  return "这是一段模拟文本，用于展示不同高度的卡片。"
    .repeat(Math.ceil(len / 20))
    .slice(0, len);
}
```

### 14.2 预估高度函数

```js
function estimateHeight(item) {
  const base = 120;
  const contentLength = item.content.length;

  if (contentLength < 40) return base;
  if (contentLength < 80) return base + 40;
  if (contentLength < 120) return base + 80;
  return base + 120;
}
```

### 14.3 双列布局函数

```js
function buildWaterfallLayout(items, options) {
  const {
    columnCount = 2,
    columnGap = 20,
    containerWidth = 1200,
    heightMap = new Map(),
  } = options;

  const columnWidth = (containerWidth - columnGap * (columnCount - 1)) / columnCount;
  const columns = new Array(columnCount).fill(0);
  const layout = [];

  items.forEach((item) => {
    const cachedHeight = heightMap.get(item.id);
    const height = cachedHeight || estimateHeight(item);
    const targetColumn = columns[0] <= columns[1] ? 0 : 1;
    const top = columns[targetColumn];
    const left = targetColumn * (columnWidth + columnGap);

    layout.push({
      ...item,
      top,
      left,
      width: columnWidth,
      height,
      columnIndex: targetColumn,
    });

    columns[targetColumn] += height + columnGap;
  });

  return {
    layout,
    totalHeight: Math.max(...columns),
    columnWidth,
  };
}
```

### 14.4 可视范围函数

```js
function getVisibleRange(layout, scrollTop, viewportHeight, overscan = 300) {
  const startBoundary = Math.max(0, scrollTop - overscan);
  const endBoundary = scrollTop + viewportHeight + overscan;

  let startIndex = 0;
  let endIndex = layout.length - 1;

  for (let i = 0; i < layout.length; i++) {
    const item = layout[i];
    if (item.top + item.height >= startBoundary) {
      startIndex = i;
      break;
    }
  }

  for (let i = startIndex; i < layout.length; i++) {
    const item = layout[i];
    if (item.top > endBoundary) {
      endIndex = i;
      break;
    }
  }

  return { startIndex, endIndex };
}
```

---

## 15. 你可以按什么顺序一步步改

为了不把问题一次性做复杂，建议按下面顺序来。

### 第一步

把 `column-count` 去掉，改成 `position: relative` + `absolute`。

### 第二步

引入 `estimateHeight`，先给每个 item 一个估算高度。

### 第三步

写 `buildWaterfallLayout`，先把双列位置算出来。

### 第四步

写 `getVisibleRange`，只渲染当前窗口内的 item。

### 第五步

用 `ref` 测真实高度，写回 `heightMapRef`。

### 第六步

如果出现跳动，再加锚点修正。

---

## 16. 最终完整代码文件结构建议

如果你真要落地，建议拆成下面几个文件：

```txt
src/pages/Waterfall/
  ├─ index.jsx
  ├─ waterfall.css
  ├─ hooks/
  │  ├─ useVirtualWaterfallData.js
  │  ├─ useScrollLoader.js
  │  ├─ useWaterfallLayout.js
  │  ├─ useMeasureHeight.js
  │  └─ useVisibleRange.js
  └─ utils/
     ├─ estimateHeight.js
     ├─ buildWaterfallLayout.js
     └─ getVisibleRange.js
```

这样写的好处是：

1. 每个 Hook 职责清晰。
2. 更适合练 React 的组织方式。
3. 后续替换成真实接口也方便。

---

## 17. 最后总结

这个改造的关键不是“把瀑布流换成虚拟列表”这么简单，而是把布局、测量、渲染范围、滚动控制拆开。

你最终要掌握的是：

- 用预估高度先撑起滚动条
- 用真实测量修正布局
- 用可视范围控制渲染
- 用 Hook 拆分职责，让逻辑清晰

如果你愿意，我下一步可以继续给你补一份“按文件拆分的最终代码清单”，直接告诉你每个文件应该写什么内容，方便你一步一步照着实现。