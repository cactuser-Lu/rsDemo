import { useCallback, useEffect, useRef, useState } from "react";

function useScrollLoader(containerRef, onLoadMore, hasMore, isLoading, offset = 120) {
  // 滚动容器当前滚动距离
  const [scrollTop, setScrollTop] = useState(0);
  // 可视区域高度（clientHeight）
  const [viewportHeight, setViewportHeight] = useState(0);
  // 可视区域宽度（用于响应式列数和列宽）
  const [viewportWidth, setViewportWidth] = useState(0);

  // 用 ref 保存最新值，避免 scroll 回调闭包拿到旧值
  const onLoadMoreRef = useRef(onLoadMore);
  const hasMoreRef = useRef(hasMore);
  const isLoadingRef = useRef(isLoading);
  // rAF 节流锁：一帧内只处理一次滚动计算
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

  // 读取容器尺寸并同步到状态，供虚拟布局计算使用
  const syncViewportSize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    setViewportHeight(container.clientHeight);
    setViewportWidth(container.clientWidth);
  }, [containerRef]);

  // 高性能滚动处理：读取 scrollTop，并在接近底部时触发分页加载
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
      // scrollHeight - (scrollTop + clientHeight) = 距离底部的剩余像素
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

    // 容器尺寸变化时，需要同步视口并重新检查是否要继续加载
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
