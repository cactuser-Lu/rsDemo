import { useCallback, useEffect, useRef, useState } from "react";

function useScrollLoader(containerRef, onLoadMore, hasMore, isLoading, offset = 120) {
  // 关键状态：滚动位置 + 可视区域尺寸
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);

  // 关键 ref：保存最新回调/状态，避免滚动闭包过期
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

  // TODO Step1: 实现同步容器尺寸（clientHeight/clientWidth）
  const syncViewportSize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    setViewportHeight(container.clientHeight)
    setViewportWidth(container.clientWidth)
  }, [containerRef]);

  // TODO Step2: 实现滚动处理（rAF 节流 + 触底加载）
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || tickingRef.current) return;

    requestAnimationFrame(() => {
      // 1) 读取 scrollTop/clientHeight/scrollHeight
      const current= container.current
      tickingRef.current=false;
      if(!current)return;

      const top = current.scrollTop
      const height = current.clientHeight
      const scrollDistance = current.scrollHeight - (top+height)
      // 2) setScrollTop / setViewportHeight
      setScrollTop(top)
      // setViewportHeight(height)
      // 3) 判断距离底部 <= offset 时触发 onLoa/dMoreRef.current()
      if(!hasMore.current || isLoading.current)return;
      if(scrollDistance){
        onLoadMore.current();
      }
    });
  }, [containerRef, offset]);

  // TODO Step3: 绑定 scroll 事件和 ResizeObserver，别忘了清理
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // ...addEventListener / observe / cleanup
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
