// 题目描述
// JS 实现一个带并发限制的异步调度器 Scheduler，保证同时运行的任务最多有两个。
// 例如目前有 4 个任务，完成时间分别为，1000ms、500ms、300ms、400ms
// 那么在该调度器中的执行完成顺序应该为 2、3、1、4
// 分析：因为1、2先进入队列中，2完成则输出2，3进入，3完成输出3，
// 此时为800ms，4进入后的200ms，1完成输出1，而后4完成输出 4。

const createTask1 = (cb, duration) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      cb();
      resolve();
    }, duration);
  });
};

// const task1 = createTask(() => console.log(123), 1000);
// 回到题目，我们应该怎么去实现这个有并发限制 Promise 调度器？
// 首先 Scheduler是一个类，new Scheduler(2) 相当于实例化一个调度器，参数 2 是任务的最大并行数。
// Scheduler有如下属性和方法，我们一一介绍它们的作用：
// 属性：
// limit：最大并行任务数
// running：当前运行的任务数
// queue：任务队列
// 方法：
// createTask：创建一个任务，参数为一个回调函数、任务执行时长，返回值为一个函数
// addTask：添加一个任务放到队列里
// start：启动，开始处理队列里的任务
// schedule：调度任务，从队列里取一个任务出来执行

class Scheduler {
  constructor(limit) {
    this.limit = limit;
    this.running = 0;
    this.queue = [];
  }
  createTask(cb,duration) {
    return () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          cb();
          resolve();
        }, duration);
      });
    };
  }
  addTask(cb,duration){
    const task=this.createTask(cb,duration)
    this.queue.push(task)
  }
  start(){
    for(let i = 0;i<this.limit;i++){//limit
        this.schedule()
    }
  }
  schedule(){
    if(this.queue.length===0||this.running>=this.limit)return
    this.running++
    const task=this.queue.shift()
    // console.log(task.toString())
    task().then(()=>{
        this.running--
        this.schedule()
    })
  }
}

// 实例化一个调度器
//并发开始、队列中的任务递归开启下一跳
const scheduler = new Scheduler(1);

// 添加任务
scheduler.addTask(() => {
  console.log("任务1");
}, 2000);
scheduler.addTask(() => {
  console.log("任务2");
}, 1000);
scheduler.addTask(() => {
  console.log("任务3");
}, 600);
scheduler.addTask(() => {
  console.log("任务4");
}, 800);

// 任务执行
scheduler.start();

// 看代码写输出结果
// var 声明的变量会被「提升」到其所在作用域（这里是 foo 函数作用域）的顶部，但赋值不会被提升
var x = 10;//全局作用域
function foo() {  //两个完全独立的变量
  console.log(x()); 
  function x (){return 123};
  let x = 20
}
foo();

// 对比：如果用 let 会怎样？
// 如果把函数内的 var x = 20 改成 let x = 20，
// 代码会报错 ReferenceError: Cannot access 'x' before initialization。
// 原因：let 也会提升，但会形成「暂时性死区（TDZ）」—— 
// 提升后未赋值的变量不能被访问，直到赋值语句执行。
// 这是 let 比 var 更严谨的地方，避免了「先使用后声明」的混乱场景

// 和 var 变量提升不同，函数声明（function x() {}）
// 会被完整提升到作用域顶部—— 不仅提升「函数名声明」，
// 还会提升「函数体」，且优先级高于变量提升（包括全局变量和局部变量）。
// 简单说：在同一个作用域内，若存在「同名的函数声明和变量声明」，
// 函数声明会 “覆盖” 变量声明，成为该标识符的默认值。
// 同一作用域内，函数声明提升 > 变量提升；局部标识符屏蔽外层同名标识符