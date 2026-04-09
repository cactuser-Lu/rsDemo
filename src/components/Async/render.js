// import React, { useState, useEffect } from "react";

// export default function Counter() {
//   const [count, setCount] = useState(0);

//   const handleClick = () => {
//     setCount(count + 1);

//     setTimeout(() => {
//       console.log(count);
//     }, 3000);
//   };

//   return <button onClick={handleClick}>{count}</button>;
// }


let state;
let listeners = [];

function useState(initValue){
    if(state === undefined)state = initValue;

    const setState = (newValue)=>{
        if(typeof newValue === 'function'){
            setState = newValue(state);
        }else{
            state = newValue;
        }

        render();
    }

    return [state,setState]
}

function Counter1(){
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(count + 1);

    setTimeout(() => {
      console.log(count);
    }, 3000);
  };
  console.log(count,'counter')
  return handleClick
}

function render (){
    console.log('first')
    const x=Counter1()
    console.log('222')
    return x
}

const x=render()
x()