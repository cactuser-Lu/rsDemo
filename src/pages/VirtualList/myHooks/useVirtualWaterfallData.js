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
  // 关键状态：列表、加载中、是否有更多
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // 关键 ref：当前页、并发锁、组件挂载状态
  const pageRef = useRef(initialPage - 1);
  const lockRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // TODO Step1: 模拟请求分页数据
  const fetchPageData = useCallback(async (pageNum) => {
    return {
      newItems: [],
      nextHasMore: false,
    };
  }, [pageSize]);

  // TODO Step2: 实现统一加载入口（replace / append）
  const loadPage = useCallback(async (pageNum, mode = "append") => {
    // if (lockRef.current) return;
    // lockRef.current = true;
    // setLoading(true);
    // try { ... } finally { ... }
  }, [fetchPageData]);

  // TODO Step3: 基于 pageRef 推进下一页
  const loadMore = useCallback(() => {
    // if (!hasMore) return;
    // loadPage(pageRef.current + 1, "append");
  }, [hasMore, loadPage]);

  // TODO Step4: 首次进入页面拉首屏
  useEffect(() => {
    // loadPage(initialPage, "replace");
  }, [initialPage, loadPage]);

  return {
    items,
    loadMore,
    hasMore,
    isLoading: loading,
  };
}

export default useVirtualWaterfallData