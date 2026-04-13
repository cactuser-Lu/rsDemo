import React, { useState, useEffect, useCallback, useRef,useMemo } from "react";
import Item from "./Item.jsx";

export default function TodoList() {
  const [items, setItems] = useState([]);

  const [inputText, setInputText] = useState("");

  const [keyword, setKeyword] = useState("");

  const inputRef = useRef();

  const handleAdd = () => {
    const newId = Math.floor(Math.random() * 1000);
    const newItem = {
      id: newId,
      title: inputText,
      content: inputText + newId,
    };
    setItems((prevItems) => [...prevItems, newItem]);
  };

  const handleKeyDown = (e) => {
    console.log(123, e.key);
    if (e.key === "Enter") {
      handleAdd();
    }
  };

   const visibleItems = useMemo(() => {
    return items.filter((item) => {
      const text = `${item.title}${item.content}`;
      return text.toLowerCase().includes(keyword.toLowerCase());
    });
  }, [items, keyword]);

  const handleDelete = useCallback((id) => {
    // const delIndx=items.findIndex(item=>item.id===id)
    // items.splice(delIndx,1)
    // setItems(() => [...items])

    setItems((prev) => prev.filter((item) => item.id !== id));
  },[]);

  const toggleItem = useCallback((id)=>{
    setItems(prev=>prev.map(item=>item.id===id? { ...item, completed: !item.completed } : item))
  },[])

  const stats = useMemo(()=>{
    const doneCount = items.filter((item) => item.completed).length;
    return {
      total: items.length,
      done: doneCount,
      todo: items.length - doneCount,
    };
  },[items])

  return (
    <div>
      <div>
        总数：{stats.total} 已完成：{stats.done} 待办：{stats.todo}
      </div>
      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="搜索任务"
      />

      {visibleItems.map((item) => (
        <div key={item.id}>{item.title}</div>
      ))}
      <br/>
      <input
        ref={inputRef}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button onClick={handleAdd}>+</button>
      {items.map((item) => {
        return <Item key={item.id} item={item} handleDelete={handleDelete} onToggle={toggleItem}/>;
      })}

      
    </div>
  );
}
