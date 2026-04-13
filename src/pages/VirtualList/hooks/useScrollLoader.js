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
