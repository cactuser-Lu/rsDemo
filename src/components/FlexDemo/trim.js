function myTrim(str){
    if(typeof str !=='string')str=String(str)
    
    return str.replace(/^\s+|\s+/g,'')
}

console.log(myTrim('   fdd   f '))

function curry(fn){

    return function(...args){
        if(args.length===fn.length){
            return fn.apply(this,args)
        }else{
            return (...newargs)=>curry(...newargs,...args)
        }
    }
}
function curry2(fn,...outer){

    return function(...innner){
        const args=[...outer,...innner]
        if(args.length===fn.length){
            return fn.apply(this,args)
        }else{
            return curry2(fn,...args)
        }
    }
}

// 原函数：接收 3 个参数
function add(a, b, c) {
  return a + b + c;
}

// 柯里化
const curriedAdd = curry2(add);

// 各种调用方式都支持
console.log(curriedAdd(1)(2)(3)); // 6
console.log(curriedAdd(1, 2)(3));  // 6
console.log(curriedAdd(1)(2, 3));  // 6
console.log(curriedAdd(1, 2, 3)); // 6