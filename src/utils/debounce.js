/**
 * 防抖函数
 * @param {Function} func - 需要防抖的函数
 * @param {Number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(func, delay) {
  let timer;
  return function(...args) {
    const context = this; // 保存调用时的this（React/Vue实例）
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(context, args); // 使用保存的this调用原函数
    }, delay);
  };
}

export default debounce;
