import { useCallback, useEffect, useRef, useState } from "react";
// 辅助函数：生成随机长度文本（产生不定高卡片）
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

export default useVirtualWaterfallData