
function debounce(fn,delay){
    let timer=null;
    return function(...args){
        clearTimeout(timer);
        timer=setTimeout(()=>{
            fn.apply(this,args)
        },delay)
    }
}
//无则重设
//清除重设
function throttle(fun,delay){
    let timer=null;
    return function(...args){
        if(!timer){
            timer=setTimeout(() => {
                clearTimeout(timer);
                fun.apply(this,args)
            }, delay);
        }
    }
}
//防抖节流  一次操作 脱离文档流 虚拟列表
// debounce(console.log,1000)('hello')

function deepClone(obj,hash=new WeakMap()){
    if(obj==null||typeof obj!=='object')return obj;
    if(hash.has(obj))return hash.get(obj);
    if(obj instanceof Date)return new Date(obj);
    if(obj instanceof RegExp)return new RegExp(obj);

    const res=Array.isArray(obj)?[]:{};
    hash.set(obj,res)
    for(let key in obj){
        if(obj.hasOwnProperty(key)){
            res[key]=deepClone(obj[key],hash)
        }
    }
    return res;
}

function deepCloneNew(obj,hash=new WeakMap()){
    if(obj==null||typeof obj !== 'object')return obj
    if(hash.has(obj))return hash.get(obj)

    const res=Array.isArray(obj)?[]:{}
    hash.set(obj,res)
    Object.keys(obj).forEach(key=>{
        res[key]=deepCloneNew(obj[key],hash)
    })

    return res
}

// const original = { a: 1, b: { c: 2 }, d: [3] };
// const deepCopy = deepClone(original);
// console.log(deepCopy)
// deepCopy.b.c = 99;
// console.log(deepCopy,original.b.c); // 输出 2

function Merge(a,l,r) {
    // write code here
    if(l==r)return l;   
    let mid=Math.floor((l+r)/2);
    let l1=Merge(a,l,mid);
    let l2=Merge(a,mid+1,r);
    console.log(l1,l2)
    return [l1,l2]
}
let res=Merge([1,2,3,4,5,6,7],0,6)
// console.log(res)


