class Scheduler {
  constructor(limit) {
    this.limit = limit;
    this.queue = [];
    this.curSize = 0;
  }

  add(task) {
    return new Promise((resolve, reject) => {
      const run = () => {
        this.curSize++;
        task()
          .then(resolve, reject)
          .finally(() => {
            this.curSize--;
            if (this.queue.length) {
              const t = this.queue.shift();
              t();
            }
          });
      };

      if (this.curSize < this.limit) {
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

// 实现一个myPromiseMap，输入一个数组、一个回调函数、一个最大并发数，返回一个数组

const myPromiseMap = (arr, cb, maxSize) => {
  const res = Array(arr.length);
  let cur = 0;
  let cnt = 0;

  return new Promise((resolve, reject) => {
    const run = () => {
      while (cnt < maxSize&&cur<arr.length) {
        if (cur === arr.length && cnt === 0) {
          resolve(res);
          return;
        }
        const curIndex = cur;
        cur++;
        cnt++;

        cb(arr[curIndex], curIndex).then((v) => {
          res[curIndex] = v;
          cnt--;
          run()
        });
      }
    };

    run()
  });
};

// 模拟异步任务（延迟 0~1000ms 随机）
const asyncDouble = (x, idx) =>
  new Promise((resolve) => {
    const delay = Math.random() * 1000;
    setTimeout(() => {
      console.log(`任务 ${idx} 完成，结果 ${x * 2}`);
      resolve(x * 2);
    }, delay);
  });

myPromiseMap([1, 2, 3, 4, 5], asyncDouble, 2).then((results) => {
  console.log("最终结果（保持顺序）:", results);
});
