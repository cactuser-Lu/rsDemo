class MyPromise {
  constructor(executor) {
    this.status = "pending";
    this.value=undefined;
    this.onFulfilledCallback = [];
    this.onRejectedCallback = [];

    const resolve = (value) => {
        console.log("resolve", value);
      if (this.status === "pending") {
        this.status = "fulfilled";
        this.value = value;
        this.onFulfilledCallback.forEach((cb) => cb(this.value));
      }
      console.log(this.onFulfilledCallback, "onFulfilledCallback");
    };

    const reject = (value) => {
      if (this.status === "pending") {
        this.status = "reject";
        this.value = value;
        this.onRejectedCallback.forEach((cb) => cb(this.value));
      }
    };
    executor(resolve, reject);
  }

  then(onFulfilled, onReject) {
    const p = new MyPromise((resolve, reject) => {
      const handleFulfilled = () => {
        setTimeout(() => {
          const res = onFulfilled(this.value);
          console.log("handleFulfilled", onFulfilled.toString(), res);
          this.resolvePromise(res, p, resolve, reject);
        }, 0);
      };
      const handleReject = () => {
        setTimeout(() => {
          const res = onReject(this.value);
          this.resolvePromise(res, p, resolve, reject);
        }, 0);
      };
      console.log("then's cb", this.status, onFulfilled, this.value);
      if (this.status === "fulfilled") {
        console.log("then's cb", onFulfilled);
        handleFulfilled();
      } else if (this.status === "reject") {
        handleReject();
      } else {
        this.onFulfilledCallback.push(handleFulfilled);
        this.onRejectedCallback.push(handleReject);
      }
    });
    return p;
  }

  resolvePromise(res, p, resolve, reject) {
    console.log(res, "resolvePromise");
    if(res instanceof MyPromise)res.then((value) => this.resolvePromise(value, p, resolve, reject));

    else if(res && res.then && typeof res.then ==='function'){
        // console.log("thenable", res.then.toString());
        res.then((value) => this.resolvePromise(value, p, resolve, reject));
    }
    resolve(res)
  }
}
// 1. 基础异步流程
// 内部立即执行用户传进来的函数
// (resolve) => {
//   setTimeout(() => resolve(10), 1000);
// };
new MyPromise((resolve) => {
  setTimeout(() => resolve(10), 0);
// resolve(10);
})
  // onFulfilled函数，当
  // (num) => {
  //   console.log("第一步：", num); // 1秒后输出：第一步：10
  //   return num * 2; // 返回普通值
  // }
  //   then中也有(rec,rej)=>{},但是作为内部回调，会包装用户传入的回调
  // 核心是等待前一步的状态，状态确定后执行用户传入的
  // 除此之外，用户的回调还会返回一个值 对回调的返回值进行处理 决定新 Promise 的最终状态
  // 判断这个值是数字 直接resolve 当前then的promise确定
  //用户回调里面返回了promise
  .then((num) => {
    console.log("第一步：", num); // 1秒后输出：第一步：10
    return num * 2; // 返回普通值
  })
  .then((num) => {
    console.log("第二步：", num); // 立即输出：第二步：20
    // 返回新 MyPromise
    return new MyPromise((resolve) => setTimeout(() => resolve(num + 5), 1000));
  })
  .then((num) => {
    console.log("最终：", num); // 再等1秒输出：最终：25
  });
