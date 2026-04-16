import { useCallback, useMemo, useRef, useState } from "react";

// 瀑布流核心：每次把卡片放到当前最短列
function findShortestColumn(columnHeights) {
  // 默认先把第 0 列当作最短列
  let targetIndex = 0;
  // 从第 1 列开始逐个比较，找到高度最小的列索引
  for (let i = 1; i < columnHeights.length; i += 1) {
    // 如果当前列更短，则更新目标列
    if (columnHeights[i] < columnHeights[targetIndex]) {
      targetIndex = i;
    }
  }
  // 返回本次卡片应该放入的列
  return targetIndex;
}

function useVirtualMasonryLayout({
  // 全量数据（逻辑上是完整列表，不是仅可见区）
  items,
  // 可视容器宽度，用于计算列宽
  viewportWidth,
  // 可视容器高度，用于计算可见区上下边界
  viewportHeight,
  // 当前滚动距离，用于虚拟裁剪
  scrollTop,
  // 未测量前的预估卡片高度，保证首屏快速排版
  estimatedItemHeight = 180,
  // 列数（例如移动端 1 列，桌面端 2 列）
  columnCount = 2,
  // 列与列之间的水平间距
  columnGap = 16,
  // 卡片与卡片之间的垂直间距
  rowGap = 16,
  // 虚拟列表缓冲区，避免滚动时白屏
  overscan = 300,
}) {
  // 记录卡片真实高度：key=item.id, value=DOM测量值
  const heightsRef = useRef(new Map());
  // 触发布局重算的版本号（真实高度变化时 +1）
  const [version, setVersion] = useState(0);

  // 计算每张卡片的绝对定位坐标与容器总高度
  const { positionedItems, totalHeight } = useMemo(() => {
    // 没有数据或容器宽度不可用时，直接返回空布局
    if (!items.length || viewportWidth <= 0) {
      return {
        positionedItems: [],
        totalHeight: 0,
      };
    }

    // 列数至少为 1，避免非法值导致除零或数组异常
    const actualColumnCount = Math.max(1, columnCount);
    // 列宽 = (容器宽度 - 总列间距) / 列数
    const calculatedColumnWidth =
      (viewportWidth - (actualColumnCount - 1) * columnGap) / actualColumnCount;

    // 列宽兜底，防止过窄时卡片不可读
    const safeColumnWidth = Math.max(120, calculatedColumnWidth);
    // 每一列当前累计高度，初始都为 0
    const columnHeights = Array.from({ length: actualColumnCount }, () => 0);

    // 遍历数据，给每个 item 计算 top/left/width/height
    const nextPositionedItems = items.map((item) => {
      // 选择当前最短列，保持瀑布流相对均衡
      const targetColumn = findShortestColumn(columnHeights);
      // 当前 item 的 top 就是目标列当前累计高度
      const top = columnHeights[targetColumn];
      // 未测量前使用估算高度，保证首屏可快速布局
      const measuredHeight = heightsRef.current.get(item.id);
      // 优先用真实高度，没有则回退到预估高度
      const height = measuredHeight ?? estimatedItemHeight;
      // left 由列索引与列宽/列间距计算得出
      const left = targetColumn * (safeColumnWidth + columnGap);

      // 放置完成后，更新目标列累计高度（包含行间距）
      columnHeights[targetColumn] = top + height + rowGap;

      // 返回携带布局信息的新对象，供渲染层绝对定位
      return {
        ...item,
        top,
        left,
        width: safeColumnWidth,
        height,
      };
    });

    // 虚拟容器总高度 = 最高列高度
    // 减去最后一个 rowGap，避免底部多出一段空白
    const contentHeight = Math.max(0, Math.max(...columnHeights) - rowGap);

    // 输出全量布局结果：所有 item 的位置 + 整体容器高度
    return {
      positionedItems: nextPositionedItems,
      totalHeight: contentHeight,
    };
    // version 变化表示真实高度回填后需要重新布局
  }, [items, viewportWidth, estimatedItemHeight, columnCount, columnGap, rowGap, version]);

  // 只保留可视区附近元素，降低渲染量
  const visibleItems = useMemo(() => {
    // 没有布局结果时直接返回空数组
    if (!positionedItems.length) return [];

    // overscan 是缓冲区，减少滚动时白屏和频繁卸载
    // 可渲染最小边界：可视区上边界向上扩展 overscan
    const min = Math.max(0, scrollTop - overscan);
    // 可渲染最大边界：可视区下边界向下扩展 overscan
    const max = scrollTop + viewportHeight + overscan;

    // 只保留与 [min, max] 有交集的 item
    return positionedItems.filter((item) => {
      // item 底部坐标
      const itemBottom = item.top + item.height;
      // 两个条件共同成立时，表示 item 在可渲染窗口内
      return itemBottom >= min && item.top <= max;
    });
  }, [positionedItems, scrollTop, viewportHeight, overscan]);

  // 为每张卡片返回 ref 回调：渲染后回填真实高度，驱动二次布局
  const registerMeasure = useCallback((id) => {
    // 返回给具体 DOM 节点的 ref 回调
    return (node) => {
      // 卸载或尚未挂载时，node 可能为 null
      if (!node) return;

      // getBoundingClientRect().height 可获取包含小数的真实渲染高度
      const measuredHeight = node.getBoundingClientRect().height;
      // 读取该 item 上一次记录的高度
      const prevHeight = heightsRef.current.get(id);

      // 首次测量或高度变化超过 1px 时，才触发重算，避免微抖动死循环
      if (prevHeight == null || Math.abs(prevHeight - measuredHeight) > 1) {
        // 回填真实高度缓存
        heightsRef.current.set(id, measuredHeight);
        // 触发布局 useMemo 重算（通过依赖 version）
        setVersion((v) => v + 1);
      }
    };
  }, []);

  // 对外返回：容器总高度 + 当前应渲染项 + 测量回调
  return {
    totalHeight,
    visibleItems,
    registerMeasure,
  };
}

export default useVirtualMasonryLayout;
