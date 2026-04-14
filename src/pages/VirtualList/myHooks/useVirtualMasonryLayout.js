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
  // key=item.id, value=真实测量高度
  const heightsRef = useRef(new Map());
  // 真实高度变更时用于强制触发布局重算
  const [version, setVersion] = useState(0);

  // TODO Step1: 计算每个卡片的绝对定位（top/left/width/height）和 totalHeight
  const { positionedItems, totalHeight } = useMemo(() => {
    return {
      positionedItems: [],
      totalHeight: 0,
    };
  }, [items, viewportWidth, estimatedItemHeight, columnCount, columnGap, rowGap, version]);

  // TODO Step2: 结合 scrollTop/viewportHeight/overscan 裁剪可视区数据
  const visibleItems = useMemo(() => {
    return positionedItems;
  }, [positionedItems, scrollTop, viewportHeight, overscan]);

  // TODO Step3: 回填真实高度（getBoundingClientRect().height）并触发重排
  const registerMeasure = useCallback((id) => {
    return (node) => {
      // if (!node) return;
      // const measuredHeight = node.getBoundingClientRect().height;
      // const prevHeight = heightsRef.current.get(id);
      // if (prevHeight == null || Math.abs(prevHeight - measuredHeight) > 1) {
      //   heightsRef.current.set(id, measuredHeight);
      //   setVersion((v) => v + 1);
      // }
    };
  }, []);

  return {
    totalHeight,
    visibleItems,
    registerMeasure,
  };
}

export default useVirtualMasonryLayout;
