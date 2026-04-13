import { useCallback, useMemo, useRef, useState } from "react";

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
  const heightsRef = useRef(new Map());
  const [version, setVersion] = useState(0);

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

    const contentHeight = Math.max(0, Math.max(...columnHeights) - rowGap);

    return {
      positionedItems: nextPositionedItems,
      totalHeight: contentHeight,
    };
  }, [items, viewportWidth, estimatedItemHeight, columnCount, columnGap, rowGap, version]);

  const visibleItems = useMemo(() => {
    if (!positionedItems.length) return [];

    const min = Math.max(0, scrollTop - overscan);
    const max = scrollTop + viewportHeight + overscan;

    return positionedItems.filter((item) => {
      const itemBottom = item.top + item.height;
      return itemBottom >= min && item.top <= max;
    });
  }, [positionedItems, scrollTop, viewportHeight, overscan]);

  const registerMeasure = useCallback((id) => {
    return (node) => {
      if (!node) return;

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
