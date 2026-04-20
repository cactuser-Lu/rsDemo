


// 1.缓存函数，背景为React中重新渲染函数的引用会改变
const cache={}

const useCallback = (cb,deps)=>{
    const key= cb.toString()

    const cached = cache[key]

    if(cached){
        const {deps:oldDeps}=cached
        const isDep=deps.every((item,i)=>item===oldDeps[i])
        if(isDep)return {cached,deps}
    }

    cache[key]={cb,deps}
    return cb
}

// 2.手撕EventEmitter

class EventEmitter{
    constructor(){
        this.events=new Map()
    }

    on(name,cb){
        if(!this.events.has(name)){
            this.events.set(name,[])
        }
        this.events.get(name).push(cb)
    }

    off(name,cb){
        if(!this.events.has(name))return;
        this.events.set(name,this.events.get(name).filter(item=>item!==cb))
    }

    emit(name,...args){
        if(!this.events.has(name))return;
        this.events.get(name).forEach(cb => {
            // 目的：让回调内部能使用 this.off / this.emit 等实例方法
            cb.apply(this,args)
        }); 
    }

    once(name,cb){
        // 包装一个函数，执行后自动移除
        const temp=(...args)=>{
            cb.apply(this,args)
            this.off(name, temp)
        }
        this.on(name, temp)
    }
}

const emitter = new EventEmitter();

function handleA(a, b) {
  console.log('handleA', a, b);
}

// 订阅
emitter.on('test', handleA);

// 只执行一次
emitter.once('test', () => {
  console.log('once');
});

// 触发
emitter.emit('test', 1, 2);
// 输出：
// handleA 1 2
// once

emitter.emit('test', 3, 4);
// 输出：
// handleA 3 4 （once 已消失）

// 取消订阅
emitter.off('test', handleA);
emitter.emit('test', 5, 6); 
// 无输出
