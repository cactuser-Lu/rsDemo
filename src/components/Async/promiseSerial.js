// 定义 type Task = () => Promise （即 Task 是一个 类型，是一个返回值是 Promise 的函数类型）
// 假设有一个数组 tasks: Task[]（每一项都是一个 Task 类型的数组）
// 实现一个方法 function execute(tasks: Task[]): Promise，
// 该方法将 tasks 内的任务 依次 执行，并返回一个结果为数组的 Promise ，
// 该数组包含任务执行结果（以执行顺序排序）
// 要求：忽略异常任务，并在结果数组中用 null 占位
// 限制：不添加任何依赖，仅使用 Promise，不使用 Generator 或 async

const Task = (result, isSuccess = true) => {
  return () =>
    new Promise((resolve, reject) => {
      setTimeout(() => {
        if (isSuccess) {
          console.log(`success: ${result}`);
          resolve(result);
        } else {
          console.log(`error: ${result}`);
          reject(result);
        }
      }, 1000);
    });
};

execute([Task("A"), Task("B"), Task("X", false), Task("C")]).then(
  (resultList) => {
    // 这里期望打印 ["A", "B", null, "C"]
    console.log(resultList);
  }
);

function execute(tasks) {
  return new Promise((resolve, reject) => {
    const res = [];
    const scheduler = (i) => {
      if (i == tasks.length) {
        resolve(res);
        return
      }
      tasks[i]().then(
        (re) => {
          res.push(re);
          scheduler(i + 1);
        },
        (rej) => {
          res.push(rej);
          scheduler(i + 1);
        }
      );
    };
    scheduler(0);
  });
}
