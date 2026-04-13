import React, { useState, useEffect,useLayoutEffect, useCallback, useRef, memo } from "react";

export function Item({ item, handleDelete, onToggle }) {
  console.log("1. 组件渲染阶段：直接执行");

  useEffect(() => {
    console.log("3. DOM 渲染后：useEffect 执行");
  });

  useLayoutEffect(() => {
    console.log("4. DOM 渲染后：useEffect 执行");
  });


  console.log("2. 组件渲染阶段：继续执行");

  const handleDel = (id) => {
    handleDelete(id);
  };

  return (
    <div onClick={() => onToggle(item.id)}>
      <span>{item.title}</span>
      <span>{item.content}</span>
      {item.completed && <strong>已完成</strong>}

      <button onClick={() => handleDel(item.id)}>-</button>
    </div>
  );
}

export default memo(Item);
