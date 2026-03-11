// 给定一个对象数组和一个回调函数，根据回调函数的返回值对数组元素进行分组。

// 例如：

// 输入: [{id: 1, type: 'A'}, {id: 2, type: 'B'}, {id: 3, type: 'A'}], item => item.type

// 输出: { A: [{id: 1, type: 'A'}, {id: 3, type: 'A'}], B: [{id: 2, type: 'B'}] }
// 复制代码
// 1
// 2
// 3
// 4
const convert = (arr) => {
  const res = {};
  arr.forEach((item) => {
    if (res[item.type]) res[item.type].push(item);
    else res[item.type] = [item];
  });
  return res;
};
console.log(
  convert([
    { id: 1, type: "A" },
    { id: 2, type: "B" },
    { id: 3, type: "A" },
  ]),
);
// 实现一个防抖函数 `debounce(func, wait, immediate)`。
// 该函数用于限制某个函数的执行频率，即在指定的时间 `wait` 内，
// 如果该函数被多次调用，则只执行最后一次调用，支持通过immediate
// 来指定是否立即执行

const debounce = (func, wait, immediate) => {
  let timeoutId = null;

  return function (...args) {
    let callNow = immediate && !timeoutId;//定时器的作用不仅仅是延迟执行，更重要的是管理“等待期”
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (!immediate) func.apply(this, args);
    }, wait);

    if(callNow)func.apply(this,args)
  };
};

const throttle = (func, wait, immediate)=>{
    let timeoutId = null;  
    return function(...args){
        let callNow = immediate && !timeoutId
        if(!timeoutId){
            timeoutId = setTimeout(() => {
                timeoutId = null;
                if(!immediate)func.apply(this, args)
            }, wait);
        }
        if(callNow)func.apply(this, args)
    } 
}
// 创建一个需要防抖的函数
function logMessage(message) {
  console.log(message, new Date().toLocaleTimeString());
}

// 创建防抖版本，等待 1000 毫秒，不立即执行
const debouncedLog = debounce(logMessage, 1000, true);
const throttleLog = throttle(logMessage, 0, true)

// 连续调用 3 次，只有最后一次会执行
// debouncedLog('消息1');
// debouncedLog('消息2');
// debouncedLog('消息3');

throttleLog('消息1');
throttleLog('消息2');
throttleLog('消息3');

// 实现一个带超时设置的异步方法**

// 1
// 2
// const asyncCallWithTimeout = (asyncPromise, timeLimit) => {
// };
