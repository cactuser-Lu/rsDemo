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
