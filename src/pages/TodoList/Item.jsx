import React, { useState, useEffect, useCallback, useRef } from "react";

export default function Item({item}){

    const [items,setItems]=useState([])

    const handleDel= ()=>{

    }

    return (
        <div>
            <span>{item.title}</span>
            <span>{item.content}</span>
            
            <button onClick={handleDel}>-</button>
        </div>
    )
}