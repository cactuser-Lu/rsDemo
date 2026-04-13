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
    setItems((items) => {
      setItems([...items, newItem]);
    });
  };

  const handleChange = (event) => {
    const newText = event.target.value;
    setInputText(newText);
  };

  return (
    <div>
      <input type="text" value={inputText} onChange={handleChange}></input>
      <button onClick={handleAdd}>+</button>
      {items &&
        items.length &&
        items.map((item) => {
          return <Item key={item.id} item={item} />;
        })}
    </div>
  );
}
