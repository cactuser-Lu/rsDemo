import { useCallback, useMemo, useRef, useState } from "react";

// 瀑布流核心：每次把卡片放到当前最短列
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
  // 记录卡片真实高度：key=item.id, value=DOM测量值
  const heightsRef = useRef(new Map());
  // 触发布局重算的版本号（真实高度变化时 +1）
  const [version, setVersion] = useState(0);

  // 计算每张卡片的绝对定位坐标与容器总高度
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
      // 未测量前使用估算高度，保证首屏可快速布局
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

    // 虚拟容器总高度 = 最高列高度
    const contentHeight = Math.max(0, Math.max(...columnHeights) - rowGap);

    return {
      positionedItems: nextPositionedItems,
      totalHeight: contentHeight,
    };
  }, [items, viewportWidth, estimatedItemHeight, columnCount, columnGap, rowGap, version]);

  // 只保留可视区附近元素，降低渲染量
  const visibleItems = useMemo(() => {
    if (!positionedItems.length) return [];

    // overscan 是缓冲区，减少滚动时白屏和频繁卸载
    const min = Math.max(0, scrollTop - overscan);
    const max = scrollTop + viewportHeight + overscan;

    return positionedItems.filter((item) => {
      const itemBottom = item.top + item.height;
      return itemBottom >= min && item.top <= max;
    });
  }, [positionedItems, scrollTop, viewportHeight, overscan]);

  // 为每张卡片返回 ref 回调：渲染后回填真实高度，驱动二次布局
  const registerMeasure = useCallback((id) => {
    return (node) => {
      if (!node) return;

      // getBoundingClientRect().height 可获取包含小数的真实渲染高度
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
