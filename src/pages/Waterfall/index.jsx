import React, { useState, useEffect, useCallback, useRef } from "react";
import "./Waterfall.css";

// ---------- 自定义 Hook 1: 滚动触底检测 ----------
function useScrollLoader(onLoadMore, hasMore, isLoading, offset = 100) {
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
      if (!hasMoreRef.current || isLoadingRef.current) return;

      const scrollTop =
        document.documentElement.scrollTop || document.body.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // 距离底部 offset 时触发
      if (scrollTop + windowHeight + offset >= documentHeight) {
        onLoadMoreRef.current();
      }
    });
  }, [offset]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    // 初次挂载也检查一次，避免内容过短时无法触发滚动
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);
}

function useMockData(initialPage = 1, pageSize = 10) {
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

  const fetchPageData = useCallback(
    async (pageNum) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      // 生成 mock 数据，不同内容导致卡片高度不一
      const startId = (pageNum - 1) * pageSize;
      const newItems = Array.from({ length: pageSize }, (_, i) => ({
        id: startId + i + 1,
        title: `卡片 ${startId + i + 1}`,
        content: getRandomContent(), // 随机内容长度，产生不定高
      }));

      const totalPages = 5;
      return {
        newItems,
        nextHasMore: pageNum < totalPages,
      };
    },
    [pageSize],
  );

  const loadPage = useCallback(
    async (pageNum, mode = "append") => {
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
    },
    [fetchPageData],
  );

  const loadMore = useCallback(async () => {
    if (!hasMore) return;
    await loadPage(pageRef.current + 1, "replace");
  }, [hasMore, loadPage]);

  useEffect(() => {
    console.log('3333')
    loadPage(initialPage, "replace");
  }, [initialPage, loadPage]);

  return { items, loadMore, hasMore, isLoading: loading };
}

// 辅助函数：生成随机长度文本（产生不定高卡片）
function getRandomContent() {
  const lengths = [30, 60, 90, 120, 150, 200];
  const len = lengths[Math.floor(Math.random() * lengths.length)];
  return "这是一段模拟文本，用于展示不同高度的卡片。"
    .repeat(Math.ceil(len / 20))
    .slice(0, len);
}

export default function Waterfall() {
  const { items, loadMore, hasMore, isLoading: dataLoading } = useMockData();
  useScrollLoader(loadMore, hasMore, dataLoading);

  const isLoading = dataLoading;

  return (
    <div className="app">
      <header className="header">
        <h1>瀑布流 · 双列卡片</h1>
        <p>滚动到底部自动加载更多（模拟分页）</p>
      </header>
      <div className="waterfall">
        {items.map((item) => (
          <div key={item.id} className="card">
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
