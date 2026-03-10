function retry(fn, maxCount, delay = 1000) {
  let cnt = 0;

  const execute = () => {
    try {
      const res = fn();
      return res;
    } catch (err) {
      if (cnt < maxCount) {
        cnt++;
        setTimeout(() => {
          execute();
        }, delay);
      }
    }
  };

  execute();
}

function retryWithPromise(fn, maxCount, delay = 1000) {
  let cnt = 0;

  const execute = () => {
    return Promise.resolve()
      .then(() => fn())
      .catch((err) => {
        cnt++;
        if (cnt < maxCount) {
          return new Promise((resolve) => setTimeout(resolve, delay)).then(() =>
            execute(),
          );
        } else {
          throw "err";
        }
      });
  };

  return execute;
}

async function retryWithFor(fn, maxCount, delay) {
  for (let cnt = maxCount; cnt >= 0; cnt--) {
    try {
      return await fn();
    } catch (err) {
      if (cnt == 0) throw err;
      const delay1 = delay * 2 ** (maxCount - cnt);

      await new Promise((resolve) =>
        setTimeout(() => {
          resolve();
        }, delay1),
      );
    }
  }
}

// 测试用函数：同步执行，随机失败/成功
function testTask() {
  // 70%概率失败，30%概率成功（提高失败概率看重试）
  const isSuccess = Math.random() > 0.7;

  if (!isSuccess) {
    console.log("网络请求超时/数据计算错误");
    throw new Error("网络请求超时/数据计算错误");
  }
  console.log("业务执行完成！");
  return "业务执行完成！";
}

// 理解回调思想和闭包
function retryRecursive(
  fn,
  maxCount,
  delay = 1000,
  attempt = 0,
  onSuccess,
  onError,
) {
  try {
    const res = fn();
    return res;
  } catch (err) {
    if (attempt < maxCount) {
      setTimeout(() => {
        retryRecursive(fn, maxCount, delay, attempt + 1);
      }, delay);
    } else {
      console.log(err);
    }
  }
}

// 使用
// retryRecursive(
//   testTask,
//   5,
//   1500,
//   0,
//   (res) => console.log("成功:", res),
//   (err) => console.log("最终失败:", err),
// );

// 理解Promise链和递归
function retryPromise(fn, maxCount, delay = 1000, attempt = 0) {
  let timeoutId = null;
  let canceled = false;

  try {
    return Promise.resolve(fn());
  } catch (err) {
    if (attempt < maxCount) {
      return new Promise(
        (resolve) =>
          (timeoutId = setTimeout(() => {
            resolve(retryPromise(fn, maxCount, delay, attempt + 1));
          }, delay)),
      );
    } else return Promise.reject(err);
  }
}

function retryRecursive(fn, maxCount, delay = 1000) {
  let timeoutId = null; // 当前定时器的 ID，用于清理
  let canceled = false; // 取消标志
  let attemptCount = 0; // 当前尝试次数（从 0 开始）

  // 取消函数：设置取消标志并清除当前定时器
  const cancel = () => {
    canceled = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  // 内部递归尝试函数（返回 Promise）
  const attempt = () => {
    // 1. 如果已取消，直接拒绝
    if (canceled) {
      return Promise.reject(new Error("Retry canceled"));
    }

    try {
      // 执行目标函数（同步或异步），统一包装成 Promise
      const result = fn();
      return Promise.resolve(result);
    } catch (err) {
      // 同步错误处理
      attemptCount++;

      // 2. 未达最大次数且未取消，则延迟重试
      if (attemptCount < maxCount && !canceled) {
        return new Promise((resolve, reject) => {
          timeoutId = setTimeout(() => {
            timeoutId = null; // 定时器触发后清除引用
            attempt().then(resolve, reject); // 递归调用，并将结果传递
          }, delay);
        });
      } else {
        // 3. 已达最大次数或已取消，返回错误
        return Promise.reject(err);
      }
    }
  };

  const promise = attempt(); // 启动重试流程
  return { promise, cancel }; // 返回 Promise 和取消函数
}

// 使用
// retryPromise(testTask, 2, 1500, 0).then((res) => console.log(1)).catch(err=>console.log(2));

// 理解async/await和递归
async function retryAsync(fn, maxCount, delay = 1000, attempt = 0) {
  try {
    const res = await fn();
    return res;
  } catch (err) {
    if (attempt < maxCount) {
      return new Promise((resolve) =>
        setTimeout(() => {
          resolve(retryAsync(fn, maxCount, delay, attempt + 1));
        }, delay),
      );
    }
    throw err;
  }
}
// 理解高阶函数和闭包
function createRetry(maxCount, delay = 1000) {
  return async (fn) => {
    for (let attempt = 0; attempt <= maxCount; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (attempt === maxCount) throw err;
        await new Promise((resolve) =>
          setTimeout(resolve, delay * (attempt + 1)),
        );
      }
    }
  };
}
// 使用
// retryAsync(testTask, 2, 500);

const retry0310 = (fn, maxCount, delay) => {
  let cnt = 0;

  const attempt = () => {
    try {
      const res = fn();
      return res;
    } catch (err) {
      if (cnt == maxCount) throw err;
      cnt++;
      setTimeout(() => {
        fn();
      }, delay);
    }
  };
  attempt();
};

const retryAsync0310 = (maxCount, delay) => {
  return async (fn) => {
    for (let i = 0; i <= maxCount; i++) {
      try {
        return await fn();
      } catch (err) {
        if (attempt === maxCount) throw err;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };
};


