# 瀑布流改造成虚拟列表（React 实战练习）

这份文档按“从旧实现到新实现”的顺序，带你把当前瀑布流改造成：

- 固定高度容器，内部滚动（降低高度出现滚动条）
- 不定高卡片：先用预估高度布局，再用真实高度回填修正
- 向下和向上滚动都能正确虚拟渲染
- 保留分页加载（滚动接近底部继续拉取）

---

## 1. 先明确改造目标

原始实现的问题：

1. 使用 `window` 滚动，不适合局部区域虚拟化。
2. `column-count` 的 CSS 瀑布流很难直接做虚拟列表（无法方便拿到每个元素的绝对位置）。
3. 卡片不定高，必须做“估算高度 + 实测纠偏”。

我们改造后的核心思路：

1. 改为“容器滚动”：固定容器高度，监听容器 `scrollTop`。
2. 用 JS 计算每个卡片的位置（`top/left`），卡片使用 `position: absolute`。
3. 初始布局时用 `estimatedItemHeight`；卡片渲染后测量真实高度，触发重排。
4. 根据 `scrollTop + viewportHeight + overscan` 只渲染可视区附近的卡片。

---

## 2. Hook 拆分（重点练习）

### Hook A：`useScrollLoader`

职责：

- 维护容器滚动状态：`scrollTop / viewportHeight / viewportWidth`
- 监听容器滚动和容器尺寸变化
- 接近底部时触发 `onLoadMore`

你能练到的语法点：

- `useRef` 保存最新回调和状态，避免高频事件闭包过期
- `requestAnimationFrame` 做滚动节流
- `ResizeObserver` 监听容器尺寸变化

### Hook B：`useVirtualMasonryLayout`

职责：

- 根据数据计算瀑布流绝对定位（放到最短列）
- 用预估高度参与布局
- 渲染后测量真实高度，更新 `Map` 后触发重排
- 根据可视窗口裁剪出 `visibleItems`

你能练到的语法点：

- `useMemo` 做布局计算缓存
- `useRef(new Map())` 缓存 item 实测高度
- `useCallback` 返回“按 id 注册 ref 的函数”

---

## 3. 第一步修改：把滚动监听从 window 改为容器

文件：`hooks/useScrollLoader.js`

关键变化：

1. 入参变成 `containerRef`。
2. 读取 `container.scrollTop/clientHeight/clientWidth`。
3. 使用 `ResizeObserver` 同步容器尺寸。
4. 在容器内计算距离底部并触发分页加载。

---

## 4. 第二步修改：新增虚拟瀑布布局 Hook

文件：`hooks/useVirtualMasonryLayout.js`

关键变化：

1. 计算列宽。
2. 每次把 item 放入当前最短列，得到 `top/left/width/height`。
3. `height` 先用预估值，后续由 `registerMeasure` 实测更新。
4. 用 overscan 做裁剪，得到 `visibleItems`。

---

## 5. 第三步修改：页面改为“虚拟渲染 + 绝对定位”

文件：`index.jsx`

关键变化：

1. 增加 `containerRef`，用 `useScrollLoader` 读取滚动状态。
2. 调用 `useVirtualMasonryLayout` 计算 `visibleItems` 和 `totalHeight`。
3. 外层滚动容器固定高度。
4. 内层 `virtual-inner` 设置总高度；卡片绝对定位渲染。

---

## 6. 第四步修改：CSS 从 column 布局改为 absolute 布局

文件：`waterfall.css`

关键变化：

1. 加一个固定高度滚动容器 `.virtual-scroll-container`。
2. `.virtual-inner` 设置 `position: relative`。
3. `.card` 改成 `position: absolute`。

---

## 7. 最终完整代码（可直接对照）

### 7.1 `src/pages/VirtualList/index.jsx`

```jsx
import React, { useMemo, useRef } from "react";
import "./waterfall.css";
import useVirtualWaterfallData from "./hooks/useVirtualWaterfallData";
import useScrollLoader from "./hooks/useScrollLoader";
import useVirtualMasonryLayout from "./hooks/useVirtualMasonryLayout";

export default function Waterfall() {
  const containerRef = useRef(null);
  const { items, loadMore, hasMore, isLoading: dataLoading } = useVirtualWaterfallData();
  const { scrollTop, viewportHeight, viewportWidth } = useScrollLoader(
    containerRef,
    loadMore,
    hasMore,
    dataLoading,
  );

  const columnCount = useMemo(() => {
    if (viewportWidth <= 700) return 1;
    return 2;
  }, [viewportWidth]);

  const { totalHeight, visibleItems, registerMeasure } = useVirtualMasonryLayout({
    items,
    viewportWidth,
    viewportHeight,
    scrollTop,
    estimatedItemHeight: 190,
    columnCount,
    columnGap: 20,
    rowGap: 20,
    overscan: 320,
  });

  const isLoading = dataLoading;

  return (
    <div className="virtual-app">
      <header className="header">
        <h1>瀑布流虚拟列表 · 双列卡片</h1>
        <p>固定容器滚动 + 不定高预估与回填修正（可上下滚动）</p>
      </header>

      <section className="panel">
        <div className="panel-meta">
          <span>scrollTop: {Math.round(scrollTop)} px</span>
          <span>可视高度: {Math.round(viewportHeight)} px</span>
          <span>总数据: {items.length}</span>
          <span>当前渲染: {visibleItems.length}</span>
        </div>

        <div ref={containerRef} className="virtual-scroll-container">
          <div className="virtual-inner" style={{ height: `${Math.max(totalHeight, viewportHeight)}px` }}>
            {visibleItems.map((item) => (
              <article
                key={item.id}
                ref={registerMeasure(item.id)}
                className="card"
                style={{
                  width: `${item.width}px`,
                  transform: `translate(${item.left}px, ${item.top}px)`,
                }}
              >
                <div className="card-title">{item.title}</div>
                <div className="card-content">{item.content}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {isLoading && <div className="loading">加载中...</div>}
      {!hasMore && items.length > 0 && (
        <div className="no-more">—— 已经到底了 ——</div>
      )}
    </div>
  );
}
```

### 7.2 `src/pages/VirtualList/hooks/useScrollLoader.js`

```js
import { useCallback, useEffect, useRef, useState } from "react";

function useScrollLoader(containerRef, onLoadMore, hasMore, isLoading, offset = 120) {
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);

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

  const syncViewportSize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    setViewportHeight(container.clientHeight);
    setViewportWidth(container.clientWidth);
  }, [containerRef]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || tickingRef.current) return;

    tickingRef.current = true;
    window.requestAnimationFrame(() => {
      const current = containerRef.current;
      tickingRef.current = false;
      if (!current) return;

      const nextScrollTop = current.scrollTop;
      const nextViewportHeight = current.clientHeight;
      const distanceToBottom = current.scrollHeight - (nextScrollTop + nextViewportHeight);

      setScrollTop(nextScrollTop);
      setViewportHeight(nextViewportHeight);

      if (!hasMoreRef.current || isLoadingRef.current) return;
      if (distanceToBottom <= offset) {
        onLoadMoreRef.current();
      }
    });
  }, [containerRef, offset]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      syncViewportSize();
      handleScroll();
    });

    container.addEventListener("scroll", handleScroll, { passive: true });
    resizeObserver.observe(container);

    syncViewportSize();
    handleScroll();

    return () => {
      container.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [containerRef, handleScroll, syncViewportSize]);

  return { scrollTop, viewportHeight, viewportWidth };
}

export default useScrollLoader;
```

### 7.3 `src/pages/VirtualList/hooks/useVirtualMasonryLayout.js`

```js
import { useCallback, useMemo, useRef, useState } from "react";

function findShortestColumn(columnHeights) {
  let targetIndex = 0;
  for (let i = 1; i < columnHeights.length; i += 1) {
    if (columnHeights[i] < columnHeights[targetIndex]) {
      targetIndex = i;
    }
  }
  return targetIndex;
}

function useVirtualMasonryLayout({
  items,
  viewportWidth,
  viewportHeight,
  scrollTop,
  estimatedItemHeight = 180,
  columnCount = 2,
  columnGap = 16,
  rowGap = 16,
  overscan = 300,
}) {
  const heightsRef = useRef(new Map());
  const [version, setVersion] = useState(0);

  const { positionedItems, totalHeight } = useMemo(() => {
    if (!items.length || viewportWidth <= 0) {
      return {
        positionedItems: [],
        totalHeight: 0,
      };
    }

    const actualColumnCount = Math.max(1, columnCount);
    const calculatedColumnWidth =
      (viewportWidth - (actualColumnCount - 1) * columnGap) / actualColumnCount;

    const safeColumnWidth = Math.max(120, calculatedColumnWidth);
    const columnHeights = Array.from({ length: actualColumnCount }, () => 0);

    const nextPositionedItems = items.map((item) => {
      const targetColumn = findShortestColumn(columnHeights);
      const top = columnHeights[targetColumn];
      const measuredHeight = heightsRef.current.get(item.id);
      const height = measuredHeight ?? estimatedItemHeight;
      const left = targetColumn * (safeColumnWidth + columnGap);

      columnHeights[targetColumn] = top + height + rowGap;

      return {
        ...item,
        top,
        left,
        width: safeColumnWidth,
        height,
      };
    });

    const contentHeight = Math.max(0, Math.max(...columnHeights) - rowGap);

    return {
      positionedItems: nextPositionedItems,
      totalHeight: contentHeight,
    };
  }, [items, viewportWidth, estimatedItemHeight, columnCount, columnGap, rowGap, version]);

  const visibleItems = useMemo(() => {
    if (!positionedItems.length) return [];

    const min = Math.max(0, scrollTop - overscan);
    const max = scrollTop + viewportHeight + overscan;

    return positionedItems.filter((item) => {
      const itemBottom = item.top + item.height;
      return itemBottom >= min && item.top <= max;
    });
  }, [positionedItems, scrollTop, viewportHeight, overscan]);

  const registerMeasure = useCallback((id) => {
    return (node) => {
      if (!node) return;

      const measuredHeight = node.getBoundingClientRect().height;
      const prevHeight = heightsRef.current.get(id);

      if (prevHeight == null || Math.abs(prevHeight - measuredHeight) > 1) {
        heightsRef.current.set(id, measuredHeight);
        setVersion((v) => v + 1);
      }
    };
  }, []);

  return {
    totalHeight,
    visibleItems,
    registerMeasure,
  };
}

export default useVirtualMasonryLayout;
```

### 7.4 `src/pages/VirtualList/hooks/useVirtualWaterfallData.js`

```js
import { useCallback, useEffect, useRef, useState } from "react";

function getRandomContent() {
  const lengths = [30, 60, 90, 120, 150, 200];
  const len = lengths[Math.floor(Math.random() * lengths.length)];
  return "这是一段模拟文本，用于展示不同高度的卡片。"
    .repeat(Math.ceil(len / 20))
    .slice(0, len);
}

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

export default useVirtualWaterfallData;
```

### 7.5 `src/pages/VirtualList/waterfall.css`

```css
:root {
  --bg: #eef2ff;
  --card-bg: #ffffff;
  --text-main: #1f2937;
  --text-sub: #5b6472;
  --line: #d8deee;
  --brand-start: #2457f5;
  --brand-end: #2fa4ff;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: radial-gradient(circle at top left, #f8fbff 0%, var(--bg) 60%, #e8eefc 100%);
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  color: var(--text-main);
}

.virtual-app {
  max-width: 1080px;
  margin: 0 auto;
  padding: 18px;
}

.header {
  text-align: center;
  margin-bottom: 16px;
}

.header h1 {
  font-size: 1.7rem;
  color: #1e2a44;
}

.header p {
  margin-top: 8px;
  color: var(--text-sub);
}

.panel {
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(31, 41, 55, 0.08);
  padding: 12px;
}

.panel-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.panel-meta span {
  font-size: 12px;
  color: #3b4a67;
  background: #f2f6ff;
  border: 1px solid #dbe5ff;
  border-radius: 999px;
  padding: 4px 10px;
}

.virtual-scroll-container {
  height: 68vh;
  min-height: 420px;
  overflow: auto;
  border-radius: 12px;
  border: 1px solid #dee5f7;
  background: linear-gradient(180deg, #f8faff 0%, #f2f7ff 100%);
}

.virtual-inner {
  position: relative;
  width: 100%;
  padding: 10px;
}

.card {
  position: absolute;
  left: 0;
  top: 0;
  background: var(--card-bg);
  border-radius: 14px;
  border: 1px solid #e2e8f5;
  box-shadow: 0 5px 15px rgba(19, 44, 97, 0.1);
  overflow: hidden;
  transition: box-shadow 0.2s ease;
  will-change: transform;
}

.card:hover {
  box-shadow: 0 10px 18px rgba(19, 44, 97, 0.18);
}

.card-title {
  background: linear-gradient(120deg, var(--brand-start), var(--brand-end));
  color: #fff;
  padding: 10px 14px;
  font-weight: 700;
  font-size: 15px;
}

.card-content {
  padding: 14px;
  color: #34425d;
  line-height: 1.6;
  font-size: 14px;
}

.loading,
.no-more {
  text-align: center;
  padding: 14px;
  font-size: 14px;
  color: #60708f;
}

@media (max-width: 700px) {
  .virtual-scroll-container {
    height: 62vh;
    min-height: 360px;
  }

  .header h1 {
    font-size: 1.4rem;
  }
}
```

---

## 8. 你可以继续练习的方向

1. 把 `registerMeasure` 升级成 `ResizeObserver`，支持卡片内容后续动态变化。
2. 加入“回到顶部”按钮，练习滚动容器 API。
3. 用 `useDeferredValue` 或 `startTransition` 练习大数据量渲染体验优化。
4. 做一个三列/四列的响应式版本，练习布局参数抽象。

如果你愿意，我下一步可以再给你一版“每一步 git diff 风格”的练习稿（Step 1 -> Step 2 -> Step 3），你可以一小步一小步手敲。