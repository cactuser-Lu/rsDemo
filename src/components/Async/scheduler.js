// ``` javascript
// const scheduler = new Scheduler(2)


// const timer = (delay) => new Promise((resolve) => setTimeout(() => resolve()), delay)
// const addTask = (delay, order) => {
// scheduler.add(timer(delay)).then(() => consloe.log(order))
// }

// addTask(1000, '1')
// addTask(300, '2')
// addTask(500, '3')
// addTask(800, '4')

// // 应输出 '2', '3', '1', '4'
// ```
class Scheduler {
  constructor(initSize) {
    this.size = initSize;
    this.queue = [];
    this.curSize = 0;
  }

  add(task) {
    return new Promise((resolve, reject) => {
      const run = () => {
        this.curSize++;
        return task()
          .then(resolve, reject)
          .finally(() => {
            this.curSize--;
            if (this.queue.length) {
              const p = this.queue.shift();
              p();
            }
          });
      };

      if (this.curSize < this.size) {
        run();
      } else {
        this.queue.push(run);
      }
    });
  }
}

const scheduler = new Scheduler(2);

const timer = (delay) =>
  new Promise((resolve) => setTimeout(() => resolve(), delay));

const addTask = (delay, order) => {
  scheduler.add(() => timer(delay)).then(() => console.log(order));
};

// addTask(1000, "1");
// addTask(300, "2");
// addTask(500, "3");
// addTask(800, "4");

// 算法: 现在有一个函数，随机返回0，1，2，3，4，5，需要你根据这个函数，
// 实现一个随机返回0，1，2，3，4，5，6，7，8的函数，返回每个数的概率都必须相等，禁止使用Math.random()
// rand6() * 6 + rand6()
// Math.floor(num / 4);

// 实现一个once函数，输入一个函数返回一个函数，记忆化第一次执行结果
function once(cb) {
  let res;
  let called;

  return () => (called ? res : ((called = true), (res = cb())));
}
// 实现一个myPromiseMap，输入一个数组、一个回调函数、一个最大并发数，返回一个数组

const myPromiseMap = (arr, cb, maxSize) => {
  const result = new Array(arr.length);
  let nextIndex = 0;
  let active = 0;

  return new Promise((resolve, reject) => {
    const run = ()=>{
        if(nextIndex===arr.length&&active===0){
            resolve(result)
            return;
        }

        while(active<maxSize && nextIndex < arr.length){
            const cur=nextIndex
            nextIndex++
            active++

            Promise.resolve(cb(arr[cur],cur)).then((v)=>{
                result[cur]=v
                active--
                run()
            })
        }
    }
    run()
  });
};


// 模拟异步任务（延迟 0~1000ms 随机）
const asyncDouble = (x, idx) =>
    new Promise(resolve => {
        const delay = Math.random() * 1000;
        setTimeout(() => {
            console.log(`任务 ${idx} 完成，结果 ${x * 2}`);
            resolve(x * 2);
        }, delay);
    });

myPromiseMap([1, 2, 3, 4, 5], asyncDouble, 2).then(results => {
    console.log('最终结果（保持顺序）:', results);
});
