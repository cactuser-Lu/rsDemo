# useVirtualMasonryLayout 详细解读

本文解释 src/pages/VirtualList/hooks/useVirtualMasonryLayout.js 在虚拟列表中的职责、数据流和重算机制，并给出一个带数字的完整例子。

## 1. 这个 Hook 在虚拟列表中的定位

它做三件事：

1. 瀑布流布局：给每个数据项计算绝对定位坐标（top/left/width/height）。
2. 虚拟裁剪：只保留可视区附近元素（visibleItems），减少 DOM 数量。
3. 真实高度回填重排：渲染后测量真实高度，再触发一次更准确的布局计算。

返回值：

- totalHeight：虚拟容器总高度，用于撑开滚动条。
- visibleItems：当前应该渲染的卡片子集。
- registerMeasure：给卡片绑定 ref，测量真实高度并触发重排。

## 2. 每个变量和 Hook 的作用

输入参数：

- items：全量数据，不是当前可见数据。
- viewportWidth：可视区域宽度，决定列宽。
- viewportHeight：可视区域高度，决定可见范围下边界。
- scrollTop：滚动偏移，决定可见范围上边界。
- estimatedItemHeight：预估高度，首屏快速布局时使用。
- columnCount：列数。
- columnGap：列间距。
- rowGap：行间距。
- overscan：缓冲区，减少白屏与频繁卸载。

内部状态与引用：

- heightsRef：Map<id, measuredHeight>，缓存真实高度，不触发渲染。
- version：数字版本号，真实高度变化时 +1，用于触发布局重算。

派生结果：

- positionedItems：全量数据的布局结果（每一项都带坐标）。
- totalHeight：最高列高度（减去最后一个 rowGap）。
- visibleItems：与可渲染区间相交的数据子集。

## 3. 核心流程

### 3.1 第一步：全量布局（useMemo A）

- 若 items 为空或宽度无效，返回空布局。
- 计算列宽：
  - calculatedColumnWidth = (viewportWidth - (columnCount - 1) * columnGap) / columnCount
  - safeColumnWidth = max(120, calculatedColumnWidth)
- 维护 columnHeights 数组，记录每列累计高度。
- 对每个 item：
  - 放入当前最短列（findShortestColumn）。
  - top = 目标列当前高度。
  - height = 真实高度或 estimatedItemHeight。
  - left = 列索引 * (列宽 + 列间距)。
  - 更新目标列累计高度：top + height + rowGap。
- totalHeight = 最高列高度 - rowGap。

### 3.2 第二步：虚拟裁剪（useMemo B）

- 计算可渲染区间：
  - min = max(0, scrollTop - overscan)
  - max = scrollTop + viewportHeight + overscan
- 仅保留与区间有交集的 item：
  - itemBottom >= min 且 item.top <= max

这一步就是虚拟列表的关键：即使 items 很多，DOM 只渲染 visibleItems。

### 3.3 第三步：真实高度回填（registerMeasure）

- 卡片挂载后通过 ref 读取真实高度 measuredHeight。
- 与缓存高度比较，变化超过 1px 才更新。
- 更新 heightsRef 后 setVersion(v + 1)。
- version 变化会让 useMemo A 重跑，产生更准确布局。

## 4. 例子：中间渲染与计算全过程

假设参数：

- viewportWidth = 420
- viewportHeight = 500
- scrollTop = 300
- columnCount = 2
- columnGap = 20
- rowGap = 20
- overscan = 200
- estimatedItemHeight = 180
- items 有 8 个，id = 1..8

### 阶段 A：首屏初算（全是估算高度）

1. 列宽计算：
   - calculatedColumnWidth = (420 - 20) / 2 = 200
   - safeColumnWidth = 200
2. 初始 columnHeights = [0, 0]
3. 依次放置（都按 180 高）：
   - item1 -> 列0, top=0,   更新列0=200
   - item2 -> 列1, top=0,   更新列1=200
   - item3 -> 列0, top=200, 更新列0=400
   - item4 -> 列1, top=200, 更新列1=400
   - item5 -> 列0, top=400, 更新列0=600
   - item6 -> 列1, top=400, 更新列1=600
   - item7 -> 列0, top=600, 更新列0=800
   - item8 -> 列1, top=600, 更新列1=800
4. totalHeight = max(800, 800) - 20 = 780

### 阶段 B：虚拟裁剪

1. 可渲染区间：
   - min = max(0, 300 - 200) = 100
   - max = 300 + 500 + 200 = 1000
2. 筛选规则：itemBottom >= 100 且 itemTop <= 1000
3. 在这个例子中 8 个都命中，所以 visibleItems 暂时是全部。

如果 items 是 2000 条，通常只会保留几十条，DOM 数量会显著下降。

### 阶段 C：真实高度回填

假设真实测量得到：

- item1 = 220
- item2 = 150
- item3 = 260
- 其他暂时未测量

registerMeasure 会把高度写入 heightsRef，并让 version 增加。

### 阶段 D：二次重排

useMemo A 重新计算时：

- item1 用 220，不再是 180
- item2 用 150，不再是 180
- item3 用 260，不再是 180
- 其余继续用 180

结果：

- 后续卡片的 top 会变化（因为列累计高度变了）。
- totalHeight 会变化。
- visibleItems 可能变化（因为 item 的 top/bottom 改变了）。

这就是不定高瀑布流虚拟列表的核心机制：先快后准。

## 5. 为什么这样设计性能更好

1. 通过 useMemo 缓存重计算，避免无关 render 触发重排。
2. 通过 visibleItems 裁剪，把渲染复杂度从全量 N 降到窗口附近 K（K << N）。
3. 通过 heightsRef 缓存真实高度，避免每次都查 DOM。
4. 通过 version 作为单一重排信号，逻辑清晰且可控。

## 6. 一句话总结

这个 Hook 把虚拟列表拆成三层：

- 布局层（算坐标）
- 裁剪层（算渲染子集）
- 测量回填层（算真实高度并触发重排）

三层配合后，就能在不定高瀑布流场景中兼顾首屏速度、滚动性能和布局准确性。
