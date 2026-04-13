import React, { useState, useEffect, useCallback, useRef } from "react";

export default function Item({item,ondel}){

    const [items,setItems]=useState([])

    const handleDel= (id)=>{
        ondel(id)
    }

    return (
        <div>
            <span>{item.title}</span>
            <span>{item.content}</span>
            
            <button onClick={()=>handleDel(item.id)}>-</button>
        </div>
    )
}