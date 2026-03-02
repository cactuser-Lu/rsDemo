const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

class MyPromise {
  constructor(executor) {
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];
    this.status = PENDING;
    this.value = undefined;
    this.reason = undefined;

    const resolve = (value) => {
      if (this.status === PENDING) {
        queueMicrotask(()=>{
          resolvePromise(
            this,
            value,
            (value)=>{
              if(this.status === PENDING){
                this.status = FULFILLED;
                this.value = value;
                this.onFulfilledCallbacks.forEach((fn) => fn());
              }
            },
            (reason)=>{
               if (this.status === PENDING) {
                this.status = REJECTED;
                this.reason = reason;
                this.onRejectedCallbacks.forEach((fn) => fn());
              }
            }
          )
        })
      }
    };
    const reject = (reason) => {
      if (this.status === PENDING) {
        this.status = REJECTED;
        this.reason = reason;
        this.onRejectedCallbacks.forEach((fn) => fn());
      }
    };
    executor(resolve, reject);
  }
  catch(onRejected){
    return this.then(null,onRejected)
  }

  then(onFulfilled, onRejected) {
    onFulfilled =
      typeof onFulfilled === "function" ? onFulfilled : (value) => value;
    onRejected =
      typeof onRejected === "function"
        ? onRejected
        : (reason) => {
            throw reason;
          };

    const promise2 = new MyPromise((resolve, reject) => {
      const handleCallback = (callback, value, resolve, reject) => {
        queueMicrotask(() => {
          try {
            const x = callback(value);
            resolvePromise(promise2, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        });
      };

      if (this.status === FULFILLED) {
        handleCallback(onFulfilled, this.value, resolve, reject);
      } else if (this.status === REJECTED) {
        handleCallback(onRejected, this.reason, resolve, reject);
      } else if (this.status === PENDING) {
        this.onFulfilledCallbacks.push(() =>
          handleCallback(onFulfilled, this.value, resolve, reject),
        );
        this.onRejectedCallbacks.push(() =>
          handleCallback(onRejected, this.reason, resolve, reject),
        );
      }
    });

    return promise2;
  }
}

function resolvePromise(promise2, x, resolve, reject) {
  if (x === promise2) {
    // return reject(new TypeError("Chaining cycle detected for promise"));
  }

  // 如果 x 是一个 thenable或者promise 对象
  if (x !== null && (typeof x === "object" || typeof x === "function")) {
    // 调用 thenable 的 then 方法，并传递 resolve 和 reject
    let then;
    try {
      // 把 x.then 赋值给 then
      then = x.then;
    } catch (error) {
      // 如果取 x.then 的值时抛出错误 error ，则以 error 为据因拒绝 promise
      return reject(error);
    }
    // 如果 then 是函数，比如thenable 的 then 方法，或者promise
    if (typeof then === "function") {
      //如果 thenable 同时调用 resolve 和 reject，只认第一个调用，
      let called = false;
      try {
        then.call(
          x, // this 指向 x
          // 如果 resolvePromise 以值 y 为参数被调用，则运行 [[Resolve]](promise, y)
          (y) => {
            // 如果 resolvePromise 和 rejectPromise 均被调用，
            // 或者被同一参数调用了多次，则优先采用首次调用并忽略剩下的调用
            if (called) return;
            called = true;
            resolvePromise(promise2, y, resolve, reject); // 递归解析 y
          },
          // 如果调用 then 方法抛出了异常 error：
          // 如果 resolvePromise 或 rejectPromise 已经被调用，直接返回
          (r) => {
            if (called) return;
            called = true;
            reject(r);
          },
        );
      } catch (error) {
        // 如果调用 then 方法抛出了异常 error：
        // 如果 resolvePromise 或 rejectPromise 已经被调用，直接返回
        if (called) return;
        // 否则以 error 为据因拒绝 promise
        reject(error);
      }
    } else {
      // 如果 then 不是函数，以 x 为参数执行 promise，把整个myThenable返回出去
      //比如这种情况
      // const myThenable = {
      //   then: success
      // };
      resolve(x);
    }
  } else {
    resolve(x);
  }
}
function resolvePromise2(promise2, x, resolve, reject) {
    if(x===promise2){
        return reject('chaining')
    }

    if(x && (typeof x === 'object'|| typeof x === 'function')){
        let then
        try{
            then=x.then
        }catch(err){
            reject(err)
        }

        if(typeof then === 'function'){
            let called=false
            then.call(
                x,
                y=>{
                    if(called)return
                    called=true
                    resolvePromise2(promise2,y,resolve,reject)
                },
                r=>{
                    if(called)return
                    called=true
                    reject(r)
                }
            )
        }
    }else if(x instanceof MyPromise){
        x.then(y=>{
            resolvePromise2(promise2,y,resolve,reject)
        },r=>reject(r))
    }else {
        resolve(x)
    }
}
const p = new MyPromise((resolve, reject) => {
  console.log("init");
  resolve("resolve11");
  // reject('reject')
  // return 'reject'
});
/**
 * 测试传递
 */
const test1 = () => {
  p.then()
    .then()
    .then()
    .then(
      (value) => console.log(value),
      (err) => console.log(err),
    );
};
// test1()
const test2 = () => {
  const P = new MyPromise((resolve, reject) => {
    resolve(1);
  });
  const p1 = P.then((value) => {
    console.log(value);
    return p1;
  },
  err=>{
    console.log(err)
  }
);

  p1.then((value) => {
    console.log(value);
  },
  err=>{
    console.log(err)
  });
  console.log(p)
  console.log(p1)
};
test2();

// const myPromise = new MyPromise((resolve, reject) => {
//   console.log("状态pending")
//   resolve('成功调用resolve')
//   reject()
// })

// myPromise.then(res => {
//   console.log(res);
// }, err => {
//   console.log(err);
// })
const myThenable = {
  then: function (resolve, reject) {
    setTimeout(() => {
      resolve("success myThenable");
      reject("fail myThenable");
    }, 1000);
  },
};

const myPromise = new MyPromise((resolve, reject) => {
  console.log("状态pending")
//   resolve('成功调用resolve')
  reject(123)
})


const myThenable2 = {
  then: function (resolve, reject) {
    setTimeout(() => {
    //   resolve("success myThenable");
      reject("fail myThenable2");
    }, 1000);
  },
};
myPromise.then(res => {
//   console.log(res);
  return myThenable
}).then(res=>{
    console.log(res);
}
).catch(err=>{
    console.log(err,1);
}).catch(err=>{
    console.log(err,2);
})