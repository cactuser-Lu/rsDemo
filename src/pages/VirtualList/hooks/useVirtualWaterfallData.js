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
  // 累积的数据源
  const [items, setItems] = useState([]);
  // 请求状态（用于UI和防抖）
  const [loading, setLoading] = useState(false);
  // 是否还有下一页
  const [hasMore, setHasMore] = useState(true);
  // 记录当前页号，避免状态异步导致页码错乱
  const pageRef = useRef(initialPage - 1);
  // 同步锁，防止并发触发重复请求
  const lockRef = useRef(false);
  // 卸载保护，避免组件卸载后 setState 报警告
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchPageData = useCallback(async (pageNum) => {
    // 模拟网络延迟
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

  // 统一页加载入口，支持 replace/append 两种模式
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

  // 仅做下一页推进，真正请求逻辑放在 loadPage
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