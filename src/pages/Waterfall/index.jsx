import React, { useState, useEffect, useCallback, useRef } from "react";
import "./Waterfall.css";

// ---------- 自定义 Hook 1: 滚动触底检测 ----------
function useScrollLoader(onLoadMore, hasMore) {
  const [isLoading, setIsLoading] = useState(false);
  const loadingRef = useRef(false);

  useEffect(() => {
    loadingRef.current = isLoading;
  }, [isLoading]);

  const handleScroll = useCallback(() => {
    if (!hasMore || loadingRef.current) return;

    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    // 距离底部 100px 时触发
    if (scrollTop + windowHeight + 100 >= documentHeight) {
      setIsLoading(true);
      onLoadMore().finally(() => setIsLoading(false));
    }
  }, [hasMore, onLoadMore]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return { isLoading };
}

function useMockData(initialPage = 1, pageSize = 10) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(initialPage);

  const fetchData = useCallback(async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    // 生成 mock 数据，不同内容导致卡片高度不一
    const startId = (pageNum - 1) * pageSize;
    const newItems = Array.from({ length: pageSize }, (_, i) => ({
      id: startId + i + 1,
      title: `卡片 ${startId + i + 1}`,
      content: getRandomContent(), // 随机内容长度，产生不定高
    }));

    const total=5
    setHasMore(pageNum<total)
    setLoading(false)

    return newItems
  }, [pageSize]);

  const loadMore = useCallback(async()=>{
    if(!hasMore||isLoading)return;
    const newPage= await fetchData(page+1)
    setItems(prev=>[...prev,...newPage])
    setPage(p=>p+1)
  })

  useEffect(()=>{
    fetchData(1).then(firstPage=>setItems(firstPage))
  },[])

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

export function Waterfall() {
  const { items, loadMore, hasMore, isLoading: dataLoading } = useMockData();
  const { isLoading: scrollLoading } = useScrollLoader(loadMore, hasMore);

  const isLoading = dataLoading || scrollLoading;

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
      {!hasMore && <div className="no-more">—— 已经到底了 ——</div>}
    </div>
  );
}
