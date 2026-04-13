# TodoList Hook 学习文档

> 说明：本文只做功能设计和实现示例，不直接修改现有源码。当前可参考的基础文件是 [src/pages/TodoList/index.jsx](src/pages/TodoList/index.jsx) 和 [src/pages/TodoList/item.jsx](src/pages/TodoList/item.jsx)。

## 1. 当前 TodoList 的基础形态

你现在的 TodoList 已经具备这些核心能力：

- 新增任务
- 删除任务
- 通过子组件渲染单条任务

这个结构很适合继续扩展，因为它天然包含了以下几类 React 学习点：

- 表单输入
- 列表渲染
- 子组件通信
- 状态更新
- 派生状态
- 副作用处理

---

## 2. 推荐学习路线

建议按下面顺序加功能：

1. 输入框自动聚焦 + 回车添加
2. 任务搜索过滤
3. 完成状态切换 + 统计栏
4. 本地持久化
5. 子组件性能优化

这个顺序的好处是：每一步都能自然引入一个常见 Hook，不会一下子把逻辑堆太复杂。

---

## 3. 功能一：输入框自动聚焦 + 回车添加

### 目标

- 页面加载后，输入框自动获得焦点
- 按 Enter 键等同于点击新增按钮
- 添加完成后清空输入框，并重新聚焦

### 适合练习的 Hook

- `useRef`
- `useEffect`
- `useCallback`（可选）

### 思路

- 用 `useRef` 拿到输入框 DOM
- 用 `useEffect` 在首次渲染后调用 `focus()`
- 新增完成后再次调用 `focus()`，提升输入效率

### 示例

```jsx
import React, { useEffect, useRef, useState } from "react";

export default function TodoList() {
  const [inputText, setInputText] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleAdd = () => {
    if (!inputText.trim()) return;

    // 添加任务...
    setInputText("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleAdd();
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button onClick={handleAdd}>+</button>
    </div>
  );
}
```

### 你会学到

- `ref` 不会触发重新渲染
- `useEffect` 适合处理“渲染完成后”的 DOM 操作
- 键盘事件和按钮事件可以复用同一套逻辑

---

## 4. 功能二：任务搜索过滤

### 目标

- 提供一个搜索框
- 输入关键字时，任务列表实时过滤
- 只根据标题或内容展示匹配项

### 适合练习的 Hook

- `useMemo`
- `useState`

### 思路

- `items` 仍然保存原始数据
- `keyword` 单独存储
- 用 `useMemo` 计算过滤后的列表

### 示例

```jsx
import React, { useMemo, useState } from "react";

export default function TodoList() {
  const [items, setItems] = useState([]);
  const [keyword, setKeyword] = useState("");

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      const text = `${item.title}${item.content}`;
      return text.toLowerCase().includes(keyword.toLowerCase());
    });
  }, [items, keyword]);

  return (
    <div>
      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="搜索任务"
      />

      {visibleItems.map((item) => (
        <div key={item.id}>{item.title}</div>
      ))}
    </div>
  );
}
```

### 你会学到

- `useMemo` 不是“必须优化”，而是“避免重复计算”
- 过滤结果属于派生数据，不适合再放一份 state
- 原始数据和展示数据要分开思考

---

## 5. 功能三：完成状态切换 + 统计栏

### 目标

- 每条任务支持 completed 状态
- 点击任务可切换完成/未完成
- 顶部显示总数、已完成数、未完成数

### 适合练习的 Hook

- `useMemo`
- `useCallback`
- `memo`

### 思路

- 每个 item 增加 `completed` 字段
- 统计信息由 `items` 派生，不单独存 state
- `Item` 用 `memo` 包裹，减少不必要重渲染
- 回调函数用 `useCallback` 保持引用稳定

### 示例：父组件

```jsx
import React, { useCallback, useMemo, useState } from "react";
import Item from "./Item";

export default function TodoList() {
  const [items, setItems] = useState([]);

  const toggleItem = useCallback((id) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item,
      ),
    );
  }, []);

  const stats = useMemo(() => {
    const doneCount = items.filter((item) => item.completed).length;
    return {
      total: items.length,
      done: doneCount,
      todo: items.length - doneCount,
    };
  }, [items]);

  return (
    <div>
      <div>
        总数：{stats.total} 已完成：{stats.done} 待办：{stats.todo}
      </div>

      {items.map((item) => (
        <Item key={item.id} item={item} onToggle={toggleItem} />
      ))}
    </div>
  );
}
```

### 示例：子组件

```jsx
import React, { memo } from "react";

function Item({ item, onToggle }) {
  return (
    <div onClick={() => onToggle(item.id)}>
      <span>{item.title}</span>
      {item.completed && <strong>已完成</strong>}
    </div>
  );
}

export default memo(Item);
```

### 你会学到

- `useCallback` 主要是为了配合 `memo`
- `memo` 只有在 props 引用稳定时才更容易发挥作用
- 统计值属于派生状态，优先用 `useMemo`

---

## 6. 功能四：本地持久化

### 目标

- 刷新页面后，任务列表还能恢复
- 新增、删除、修改后自动同步到 `localStorage`

### 适合练习的 Hook

- `useEffect`
- `useState`

### 思路

- 初始化时从 `localStorage` 读取列表
- 当 `items` 改变时，再写回 `localStorage`

### 示例

```jsx
import React, { useEffect, useState } from "react";

const STORAGE_KEY = "todo-items";

export default function TodoList() {
  const [items, setItems] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  return <div>{/* render items */}</div>;
}
```

### 你会学到

- `useState(() => initialValue)` 可以做惰性初始化
- 读取只做一次，写入随状态变化而变化
- `useEffect` 是同步外部系统的标准入口

---

## 7. 功能五：删除确认弹层

### 目标

- 点击删除时先弹出确认框
- 确认后再真正删除

### 适合练习的 Hook

- `useRef`
- `useState`
- `useEffect`

### 思路

- 用 `useState` 控制弹层显示/隐藏
- 用 `useRef` 记录“即将删除的 id”
- 确认时再执行删除

### 示例

```jsx
import React, { useRef, useState } from "react";

export default function TodoList() {
  const [items, setItems] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const pendingDeleteId = useRef(null);

  const requestDelete = (id) => {
    pendingDeleteId.current = id;
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    setItems((prev) => prev.filter((item) => item.id !== pendingDeleteId.current));
    setShowConfirm(false);
    pendingDeleteId.current = null;
  };

  return <div>{/* modal and list */}</div>;
}
```

### 你会学到

- `ref` 很适合保存临时中间值
- 不是所有“状态”都需要触发重渲染

---

## 8. 功能六：删除和新增时的性能意识

### 目标

- 理解什么时候要用 `useCallback`
- 理解什么时候要用 `memo`
- 理解什么时候完全不用优化

### 适合练习的 Hook

- `useCallback`
- `memo`

### 思路

如果 `Item` 是一个较复杂组件，并且父组件频繁刷新，那么可以：

- 用 `useCallback` 稳定 `onDelete` / `onToggle`
- 用 `memo` 包裹 `Item`

### 示例

```jsx
const handleDelete = useCallback((id) => {
  setItems((prev) => prev.filter((item) => item.id !== id));
}, []);
```

```jsx
export default memo(Item);
```

### 你会学到

- `useCallback` 不是性能银弹
- 只有“函数引用稳定”有实际意义时再用
- 过度包装会让代码更难读

---

## 9. 你现在这份 TodoList 最适合的实战顺序

结合你现有代码，我建议你按这个顺序练：

1. 自动聚焦 + 回车添加
2. 搜索过滤
3. 完成状态 + 统计栏
4. 本地持久化
5. 删除确认弹层
6. `memo` + `useCallback` 性能优化

这个顺序的好处是：每一步都能看见 Hook 的真实作用，不会把优化和功能混在一起。

---

## 10. 常见判断标准

### 什么时候用 useEffect

- 初始化时读取外部数据
- 状态变化后同步到外部环境
- 需要绑定/解绑事件

### 什么时候用 useRef

- 记录 DOM
- 记录临时值
- 记录不会触发渲染的数据

### 什么时候用 useMemo

- 计算结果来自已有 state
- 计算过程较重，且依赖变化不频繁

### 什么时候用 useCallback

- 函数要传给子组件
- 子组件用了 `memo`
- 函数要作为别的 Hook 的依赖

### 什么时候用 memo

- 子组件渲染成本高
- 子组件 props 可稳定
- 你确认有真实收益，而不是盲目包一层

---

## 11. 一句话总结

TodoList 这个 Demo 最适合拿来练“输入、列表、派生状态、外部同步、性能优化”这五类 Hook。你不需要一次性全用上，而是按功能逐步加，这样才能真正理解每个 Hook 在 React 里的作用。
