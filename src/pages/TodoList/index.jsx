import React, { useState, useEffect, useCallback, useRef } from "react";
import Item from "./Item.jsx";

export default function TodoList() {
  const [items, setItems] = useState([]);

  const [inputText, setInputText] = useState("");

  const handleAdd = () => {
    const newId = Math.floor(Math.random() * 1000);
    const newItem = {
      id: newId,
      title: inputText,
      content: inputText + newId,
    };
    setItems((prevItems) => [...prevItems, newItem]);
  };

  const handleChange = (event) => {
    const newText = event.target.value;
    setInputText(newText);
  };

  const del=(id)=>{
    const delIndx=items.findIndex(item=>item.id===id)
    const newItem= items.splice(delIndx,1)
    setItems((prevItems) => [...prevItems, newItem])
  }

  return (
    <div>
      <input type="text" value={inputText} onChange={handleChange}></input>
      <button onClick={handleAdd}>+</button>
      {items.map((item) => {
        return <Item key={item.id} item={item} ondel={del}/>;
      })}
    </div>
  );
}
