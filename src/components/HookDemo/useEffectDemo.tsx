import { useState, useEffect, useRef, useLayoutEffect } from "react";

function EffectCompare() {
  const [color, setColor] = useState("red");
  const [isExpanded, setIsExpanded] = useState(false);
  const [count, setCount] = useState(0);
  const divRef = useRef(null);

  // 场景1：使用 useEffect 操作 DOM
  useEffect(() => {
    // DOM 更新后，浏览器先渲染（显示 red），再执行这里的代码（修改为 blue）
    // 会出现「red 一闪而过，再变成 blue」的闪烁效果
    const div = document.getElementById("test-div");
    if (div) {
      div.style.backgroundColor = "red";
      setTimeout(() => {
        div.style.backgroundColor = "blue";
      }, 0);
    }
  }, [color]);
  useEffect(() => {
    if (isExpanded && divRef.current) {
      divRef.current.style.height = "200px";
    }
  }, [isExpanded]);

  const handleClick = () => {
    // 函数式更新：回调函数不会立即执行，被放入 React 更新队列
    setCount(prevCount => prevCount + 1); 

    setTimeout(() => {
      console.log("闭包中的旧快照：", count); // 依然输出 0（闭包捕获的还是旧快照）
    }, 0);
  };

  // 场景2：使用 useLayoutEffect 操作 DOM（注释上面的 useEffect，打开这个注释对比）
  // useLayoutEffect(() => {
  //   // DOM 更新后，浏览器渲染前执行，直接修改为 blue，无闪烁
  //   const div = document.getElementById('test-div');
  //   if (div) {
  //     div.style.backgroundColor = 'blue';
  //   }
  // }, [color]);

  return (
    <div>
      <div
        id="test-div"
        style={{
          width: "200px",
          height: "200px",
          backgroundColor: color, // 初始值 red
          marginTop: "20px",
        }}
      />
      <div ref={divRef}>
        <button onClick={handleClick}>{isExpanded ? "折叠" : "展开"}</button>
      </div>
      <button onClick={() => setColor("red")} style={{ marginTop: "20px" }}>
        重置并查看效果{count}
      </button>
    </div>
  );
}

export default EffectCompare;
