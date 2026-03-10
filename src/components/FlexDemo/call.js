
const person={
    name:'1220',
    age: 12
}

function a(msg1,m2){
    console.log(this.age,msg1,m2)
}

a.call(person,123)

/**
 * 核心就是把函数当成对象的属性然后调用
 * 注意 不要影响到原始对象
 */

function call(context,...args){
    if(typeof context === 'undefined' || context === null){
        context = window
    }

    let fnSymbol = Symbol();
    context[fnSymbol] = this;
    const res = context[fnSymbol](...args)
    delete context[fnSymbol]
    return res
}
function apply(context, args){
    if(typeof context === 'undefined' || context === null){
        context = window
    }

    let fnSymbol= Symbol();
    context[fnSymbol]=this
    const res =context[fnSymbol](...args)
    delete context[fnSymbol]
    return res
}

function bind(context,...outer){
    const self = this;

    return function fn(...args){
        console.log(this, fn, this instanceof fn, 'xxx')
        if(this instanceof fn ){
            // return new self(...outer,...args)
        }
        return self.apply(context,[...outer,...args])
    }
}
// new 创建一个新对象，做了下面几件事：
// 创建一个空对象 {}；
// 空对象的原型属性 __proto__ 指向构造函数的原型对象 Person.prototype；
// 函数中的 this 设置为这个空对象；
// 如果该函数不返回一个对象，就返回这个 this，否则返回这个对象。
function myNew(constructor, ...args){
    const obj = Object.create(constructor.prototype)
    const res = constructor.apply(obj, args)

    return typeof res === 'object' && res !==null || typeof obj === 'function'
    ? res
    : obj
}

Function.prototype.myCall = call
Function.prototype.myApply = apply
Function.prototype.myBind = bind
// a.myApply(person,[123,456])
// 测试用构造函数
function Person(name, age) {
  this.name = name;
  this.age = age;
  console.log("this指向：", this);
}
Person.prototype.say = function () {
  console.log(`我是${this.name}`);
};

// 定义上下文对象
const obj = { city: "北京" };

const BoundPerson = Person.myBind(obj, "张三"); // bind绑定this=obj，传参name=张三
BoundPerson(18); // 调用，传参age=18

// 结果：this 指向 obj，obj 上新增 name/age 属性
// this指向：{ city: '北京', name: '张三', age: 18 }

// const p = new BoundPerson(20); // new 调用！
const p = myNew(BoundPerson, 20)

// 结果：this 指向 new 创建的新对象，bind 的 obj 完全失效
// this指向：Person { name: '张三', age: 20 }

// p.say(); // 我是张三 → 原型继承生效
console.log(p instanceof Person,obj,p); // true → 类型判断正确