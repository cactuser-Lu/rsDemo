// 普通函数（可执行、可作为构造函数）
function Person(name) {
  this.name = name; // 构造函数模式：this指向未来创建的实例
}
// 调用函数（执行逻辑）
function add(a, b) {
  return a + b;
}
console.log(add(1, 2)); // 3（函数的“执行”能力）

// 函数也是对象：可以添加属性
Person.version = "1.0";
console.log(Person.version); // 1.0

Person.prototype.greet = function () {
  console.log("Hello, " + this.name,this);
}
Person.prototype.greet()
new Person(12).greet()

function throttle(fn,delay){
  let timer=null
  return function(...args){
    if(!timer){
      timer=setTimeout(() => {
      fn.apply(this,args)
      clearTimeout(timer)
    }, delay);
    }
    
  }
}

function debounce(fn,delay){
  let timer=null
  return function(...args){
    clearTimeout(timer)
    timer=setTimeout(() => {
      fn.apply(this,args)
    }, delay);
  }
}

const f=throttle(console.log,1000)
f(1)
setTimeout(() => {
  f(1)
}, 1000);
setTimeout(() => {
  f(1)
}, 2000);
f(1)