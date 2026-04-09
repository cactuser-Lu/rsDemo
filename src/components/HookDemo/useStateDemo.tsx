import { useState, useEffect } from "react";
import useInterval from './useInterval'

function Counter() {
  // 每次渲染，都会创建一个全新的count常量（当前渲染的快照）
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(count + 1); // 通知React更新全局状态，触发未来的重渲染
    setTimeout(() => {
      console.log(count); // 捕获当前渲染的count快照，永远是点击时的值
    }, 1000);
  };

  // useEffect(() => {
  //   const intervalId = setInterval(() => {
  //     setCount((prevCount) => prevCount + 1);
  //   }, 1000);
  //   return () => clearInterval(intervalId);
  // }, []); // 空依赖数组

   useInterval(() => {
    setCount(prev => prev + 1);
  }, 1000);

  return <button onClick={handleClick}>当前计数：{count}</button>;
}

export default Counter;
