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
        this.status = FULFILLED;
        this.value = value;
        this.onFulfilledCallbacks.forEach((fn) => fn());
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

  then(onFulfilled, onRejected) {
    onFulfilled =
      typeof onFulfilled === "function" ? onFulfilled : (value) => value;
    onRejected =
      typeof onRejected === "function" ? onRejected : (reason) => {throw reason};//关键，这里抛出，下面就可以在没定义的时候传递下去

    const p1 = new MyPromise((resolve, reject) => {
      const handleCallback = (cb, value, resolve, reject) => {
        queueMicrotask(() => {
          try {
            const x = cb(value);
            resolvePromise(x, p1, resolve, reject);
          } catch (err) {
            console.log(err,'catch2')
            reject(err);
          }
        });
      };

      if (this.status === "fulfilled") {
        handleCallback(onFulfilled, this.value, resolve, reject);
      } else if (this.status === "rejected") {
        handleCallback(onRejected, this.reason, resolve, reject);
      } else if (this.status === "pending"){
        this.onFulfilledCallbacks.push(() =>
          handleCallback(onFulfilled, this.value, resolve, reject),
        );
        this.onRejectedCallbacks.push(() =>
          handleCallback(onRejected, this.reason, resolve, reject),
        );
      }
    });
    return p1;
  }

  catch(onRejected){
    return this.then(null,onRejected)
  }

  finally(cb){
    return this.then(
        value=>MyPromise.resolve(cb()).then(()=>value),
        reason=>MyPromise.resolve(cb()).then(()=>{throw reason})
    )
  }

  static resolve(x){
    if(x instanceof MyPromise)return x

    return new MyPromise((resolve,reject)=>{
        resolve(x)
    })
  }

  static reject(x){

    return new MyPromise((resolve,reject)=>{
        reject(x)
    })
  }

  static all(ps){
    let cnt = 0
    const ans=[]
    return new MyPromise((resolve,reject)=>{
        ps.forEach((p,i)=>{
            p.then(res=>{
                ans[i]=res
                cnt++
                if(cnt===ps.length)resolve(ans)
            },
            reason=>{
                reject(reason)
            }
        )
        })
    })

  }

  static race(ps){
    return new MyPromise((resolve,reject)=>{
        ps.forEach(p=>Promise.resolve(p).then(resolve,reject))
    })
  }

  static any(ps){
    return new MyPromise((resolve,reject)=>{
        let cnt =0;
        let ans=[]
        ps.forEach(p=>{
            MyPromise.resolve(p).then(
                resolve,
                reason=>{
                    cnt++
                    ans[i]=reason
                    if(cnt===ps.length)reject(ans)
                }
            )
        })
    })
  }
}

function resolvePromise(x, p1, resolve, reject) {
  if (x === p1) {
    reject(new TypeError("chaining"));
  }

  if (x instanceof MyPromise) {
    x.then((y) => {
      resolvePromise(y, p1, resolve, reject);
    });
  } else if (x !== null && (typeof x === "object" || typeof x === "function")) {
    let then;
    let called = false;
    try {
      then = x.then;
      if (typeof then === "function") {
        then.call(
          x,
          (y) => {
            if (called) return;
            called = true;
            resolvePromise(y, p1, resolve, reject);
          },
          (r) => {
            if (called) return;
            called = true;
            reject(r)
          },
        );
      }
      else resolve(x)
    } catch (err) {
      console.log(x,err,'catch')
      reject(err);
    }
  } else resolve(x);
}

const myPromise = new MyPromise((resolve, reject) => {
  console.log("状态pending")
//   resolve('成功调用resolve')
  reject(123)
})


const myThenable = {
  then: function (resolve, reject) {
    setTimeout(() => {
    //   resolve("success myThenable");
      reject("fail myThenable");
    }, 1000);
  },
};
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