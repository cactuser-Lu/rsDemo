
const race=(promises)=>{
    return new Promise((resolve,reject)=>{
        for(let i=0;i<promises.length;i++){
            Promise.resolve(promises[i]).then(resolve,reject)
        }
    })
}
const ps=[
    new Promise(resolve=>{
        setTimeout(()=>resolve(1),5000)
    }),
    new Promise(resolve=>{
        setTimeout(()=>resolve(2),3000)
    }),
    new Promise((resolve,reject)=>{
        setTimeout(()=>reject(100),2000)
    }),
    new Promise(resolve=>{
        setTimeout(()=>resolve(3),3000)
    }),
]
race(ps).then(res=>{
    console.log(res)
}).catch(err=>{
    console.log(err)
})

function deepClone(obj,hash=new WeakMap()){
    if(obj==null||typeof obj!='object'||typeof obj==='function')return obj
    if(hash.has(obj))return hash.get(obj)

    let clone={}
    if(obj instanceof Promise){
    // new Promise：创建一个和原 Promise 状态同步的「新 Promise 实例」（保证异步特性）；
    // obj.then(...)：监听原 Promise 的状态变化，拿到结果（res）或错误（err）；
    // deepClone(res, hash)：对结果 / 错误做深拷贝（比如结果是对象时，避免共享引用）；
    // resolve/reject：让新 Promise 进入和原 Promise 一致的状态，同时传递深拷贝后的结果。
    // Promise 拷贝 = 新容器（new Promise）+ 旧内容的复制品（深拷贝结果）
        clone=new Promise((resolve,reject)=>{
            obj.then(res=>resolve(deepClone(res,hash)),err=>reject(deepClone(err,hash)))
        })
    }else if(obj instanceof Date)clone=new Date(obj)
    else if(obj instanceof Array)clone=[]
    else if(obj instanceof Object)clone={}
    hash.set(obj,clone)
    Object.keys(obj).forEach(key=>{
        clone[key]=deepClone(obj[key],hash)
    })
    return clone
}

function deepClone(obj, hash = new WeakMap()) {
  // 1. 基本类型（含 null/undefined/function）直接返回（函数浅拷贝即可）
  if (obj == null || typeof obj !== 'object' || typeof obj === 'function') {
    return obj;
  }

  // 2. 循环引用：返回已拷贝的对象（而非原对象）
  if (hash.has(obj)) {
    return hash.get(obj);
  }

  let clone;

  // 3. 特殊引用类型识别与拷贝
  if (obj instanceof Promise) {
    // 场景1：拷贝Promise实例（保持异步，递归拷贝resolve/reject结果）
    clone = new Promise((resolve, reject) => {
      obj.then(
        (res) => resolve(deepClone(res, hash)), // 结果深拷贝
        (err) => reject(deepClone(err, hash))  // 错误深拷贝
      );
    });
  } else if (obj instanceof Date) {
    clone = new Date(obj); // Date：拷贝时间戳
  } else if (obj instanceof RegExp) {
    clone = new RegExp(obj.source, obj.flags); // RegExp：拷贝源正则+修饰符
  } else if (obj instanceof Array) {
    clone = [];
  } else if (obj instanceof Object) {
    clone = {}; // 普通对象（含class实例，需保留原型）
    Object.setPrototypeOf(clone, Object.getPrototypeOf(obj)); // 继承原型
  }

  // 4. 存储「原对象→拷贝对象」映射，解决循环引用
  hash.set(obj, clone);

  // 5. 遍历所有自有属性（含可枚举、不可枚举、Symbol）
  Reflect.ownKeys(obj).forEach((key) => {
    // 仅拷贝对象自身属性（不拷贝原型链属性）
    if (obj.hasOwnProperty(key)) {
      clone[key] = deepClone(obj[key], hash);
    }
  });

  return clone;
}

// 场景2：若需等待Promise resolved后拷贝结果（异步深拷贝）
async function deepCloneWithPromise(obj, hash = new WeakMap()) {
  if (obj == null || typeof obj !== 'object' || typeof obj === 'function') {
    return obj;
  }
  if (hash.has(obj)) {
    return hash.get(obj);
  }

  let clone;

  if (obj instanceof Promise) {
    // 等待Promise resolved后，拷贝结果
    const resolvedResult = await obj;
    clone = await deepCloneWithPromise(resolvedResult, hash);
  } else if (obj instanceof Date) {
    clone = new Date(obj);
  } else if (obj instanceof RegExp) {
    clone = new RegExp(obj.source, obj.flags);
  } else if (obj instanceof Array) {
    clone = [];
  } else {
    clone = {};
    Object.setPrototypeOf(clone, Object.getPrototypeOf(obj));
  }

  hash.set(obj, clone);

  await Promise.all(
    // Reflect.ownKeys = Object.keys 的 “增强版”，拷贝时用它能避免属性遗漏，尤其是特殊对象
    Reflect.ownKeys(obj).map(async (key) => {
      if (obj.hasOwnProperty(key)) {
        clone[key] = await deepCloneWithPromise(obj[key], hash);
      }
    })
  );

  return clone;
}

const obj={a:Promise.resolve(123)}
console.log(deepClone(obj))

// 1. 原函数的缺陷：Object.keys 遍历不完整
// 原函数用 Object.keys(obj) 遍历属性，它只能拿到「可枚举、非 Symbol 类型的自有属性」，
// 就像 “只看盒子表面贴了标签的东西”，会遗漏 3 类关键属性：
// 不可枚举属性：比如 Promise 的 then、catch 方法（Promise 实例的核心方法，却是不可枚举的）；
// Symbol 类型属性：比如 obj[Symbol('key')] = 456，Object.keys 会忽略；
// ES6 私有属性：比如 class A { #x = 1 }，#x 是不可枚举的自有属性，Object.keys 拿不到。
// 这些遗漏会导致拷贝后的对象 “残缺”（比如 Promise 没有 then 方法，无法监听状态）。
// 2. Reflect.ownKeys 的核心作用：“查家底”（遍历所有自有属性）
// Reflect.ownKeys(obj) 是 ES6 新增的 API，作用是返回对象「所有自有属性的键名」，不管属性是否可枚举、是否是 Symbol 类型，相当于 “把盒子里所有东西都拿出来盘点”，包括：
// 可枚举属性（如 obj.a = 123）；
// 不可枚举属性（如 Object.defineProperty(obj, 'b', { enumerable: false, value: 456 })）；
// Symbol 属性（如 obj[Symbol('c')] = 789）；
// ES6 私有属性（如 #x）。