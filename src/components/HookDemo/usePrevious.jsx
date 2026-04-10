import React, { useState, useEffect,useRef } from 'react';

export function usePrevious(value){
    const ref= useRef()
    const [prev,setPrev]=useState(undefined)

    useEffect(()=>{
        setPrev(ref.current)
        ref.current=value
    },[value])

    return prev
}
function Counter() {
  const [count, setCount] = useState(0);
  const prevCount = usePrevious(count);

  return (
    <div>
      <p>Now: {count}, Before: {prevCount}</p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
    </div>
  );
}
