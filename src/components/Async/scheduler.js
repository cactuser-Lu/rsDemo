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
        run()
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

addTask(1000, "1");
addTask(300, "2");
addTask(500, "3");
addTask(800, "4");

// 算法: 现在有一个函数，随机返回0，1，2，3，4，5，需要你根据这个函数，
// 实现一个随机返回0，1，2，3，4，5，6，7，8的函数，返回每个数的概率都必须相等，禁止使用Math.random()

// 实现一个once函数，输入一个函数返回一个函数，记忆化第一次执行结果
// 实现一个myPromiseMap，输入一个数组、一个回调函数、一个最大并发数，返回一个数组
