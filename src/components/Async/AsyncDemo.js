console.log('0: 同步代码开始');

async function asyncFn() {
  console.log('1: async函数同步部分'); // 阶段1：同步入栈执行
  await console.log(222); // 关键：await的执行逻辑
  console.log('2: await后的代码'); // 阶段3：微任务中入栈执行
  return 'async返回值';
}

// 调用async函数
asyncFn().then(res => {
  console.log('3: async返回值', res); // 微任务：async函数返回的Promise回调
});

console.log('4: 同步代码结束');

/**
 * 很多人会误以为 await 会等待 setTimeout 的回调执行，
 * 但核心结论是：await 只等待「thenable 对象（如 Promise）
 * 的决议」，而 setTimeout(...) 的返回值是定时器 ID（数字）
 * （非 thenable），因此 await 会立即将其包装为 
 * Promise.resolve(定时器ID)，不会等待定时器回调执行。
 * 
 * async 函数的同步部分（await 之前） 直接进入执行栈，和普通函数无区别；
await 是执行栈的 “暂停开关”：同步执行 await 表达式后，让出执行栈，后续代码进入微任务队列；
执行栈清空（当前宏任务的同步代码执行完）后，微任务队列中的 await 后续代码重新入栈执行；
整个过程的核心是：async/await 并未脱离 “执行栈 + 宏 / 微任务” 模型，只是 Promise 微任务的语法糖。
 * 
*/