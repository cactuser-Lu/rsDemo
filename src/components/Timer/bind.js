

Function.prototype.call2= function(thisArg,...args){
    const fn=this;
    if(thisArg==null||thisArg==undefined){
        thisArg=window
    }
    thisArg=Object(thisArg)
    const symbolProp= Symbol('symbolProp')
    
    thisArg[symbolProp]=fn;
    const res=thisArg[symbolProp](...args)
    delete thisArg[symbolProp]
    return res
}

Function.prototype.apply2=function(thisArg,args){
    const fn=this
    if(thisArg==null||thisArg==undefined){
        thisArg=window
    }
    thisArg=Object(thisArg)
    const param=Array.isArray(args)?args:[];
    const symbolProp=Symbol('symbolProp')
    thisArg[symbolProp]=fn
    const res=thisArg[symbolProp](...param)
    delete thisArg[symbolProp]
    return res
}

Function.prototype.bind2=function(thisArg,...args1){
    const fn=this
    if(thisArg==null||thisArg==undefined){
        thisArg=window
    }
    thisArg=Object(thisArg)
    const bindFn=function(...args2){
        const param=[...args1,...args2]

        const isNewCall=this instanceof bindFn
        // const finalThis=isNewCall?this:Object(thisArg)

        if(isNewCall){
            return new fn(...param)
        }

        const symbolProp=Symbol('symbolProp')
        thisArg[symbolProp]=fn
        const res=thisArg[symbolProp](...param)
        delete thisArg[symbolProp]
        return res
    }
    return bindFn
}

var value = 2;
var obj = { value: 1 }
function bar(name, age) {
  console.log(this.value);
  return {
    value: this.value,
    name: name,
    age: age
  } 
}
 console.log(bar.bind2(obj, 'kevin')(19))

 // 测试：用 new 调用 badBind 返回的函数
function Person(name) {
  this.name = name; // 预期 this 指向实例，但实际指向 thisArg
}

const obj2 = { name: '默认名' };
const BadBoundPerson = Person.bind2(obj2);
const p = new BadBoundPerson('张三');
console.log('--------------')
console.log(p.name); // undefined（实例没有 name 属性）
console.log(obj2.name); // 张三（name 被挂载到了绑定的 obj 上，完全错误！）
console.log(p instanceof Person); // false（失去原型继承，不是 Person 的实例）
console.log('--------------')
 function myNew(fn,...args){
    const newObj=Object.create(fn.prototype)
    console.log(newObj,'pro')
    const result=fn.apply(newObj,args)
    console.log(newObj,'pro1')
    const isObject = typeof result === 'object' && result !== null;
    const isFunction = typeof result === 'function';
    return isObject || isFunction ? result : newObj;
 }

function Person(name, age) {
  this.name = name;//赋值本质上是在给一个新对象写入属性
  this.age = age;
}
const p2 = myNew(Person, '李四', 25);
console.log(typeof p2)
//bind本质是从目标里取属性，new是向新的目标写属性
//bind后，在new里面有一次 bindfn.apply(newObj,args)，
// bindfn的this应该去newObj里取，但是bindfn中的原始fn指向的却是obj
// this 没有指向新实例，而是指向了 bind 绑定的 obj,
// 构造函数的属性（this.name）被挂载到了外部对象上，实例本身为空
//所以 bindfn被new调用的时候，应该直接返回new fn()