
let fiber = {
  memoizeState: null,
  nextEffect: null,
  nextLayoutEffect: null,
};

let hookIndex = 0;
let isRendering = false;

function browserPaint() {
  console.log("✅ 浏览器完成页面绘制");
}

function scheduleRender() {
  if (isRendering) return;
  isRendering = true;

  setTimeout(() => {
    hookIndex = 0;
    fiber.nextEffect = null;
    fiber.nextLayoutEffect = null;
    // fiber.memoizeState = null;

    console.log("\n========== 组件渲染开始 ==========");
    const component = App(); // 执行组件函数，生成新的闭包快照
    console.log("========== 组件渲染结束，DOM已更新 ==========\n");
    isRendering = false;

    // 严格对齐React的执行时机
    // 1. 同步执行useLayoutEffect（绘制前）
    console.log("--- 同步执行useLayoutEffect ---");
    runLayoutEffects();
    // 2. 浏览器绘制
    browserPaint();
    // 3. 异步执行useEffect（绘制后）
    console.log("\n--- 异步执行useEffect ---");
    runEffects();
  }, 2000);
}

function runEffects(){
    let effect = fiber.nextEffect;
    while(effect){
        if(effect.destroy)effect.destroy();
        effect.destroy = effect.callback();
        effect = effect.next;
    }
}

function runLayoutEffects(){
    let effect = fiber.nextLayoutEffect;
    while(effect){
        if(effect.destroy)effect.destroy();
        effect.destroy = effect.callback();
        effect = effect.next;
    }
}

function useState0(initValue){
    const currentIndex = hookIndex;

    let oldHook = fiber.memoizeState;
    for(let i = 0; i< currentIndex; i++)oldHook = oldHook?.next;

    const newHook = {
        state: oldHook ? oldHook.state: initValue,
        next: null
    }

    const setState = (newValue)=>{
        const final = typeof newValue==='function'?newValue(newHook.state):newValue;
        if(final === newHook.state)return;
        newHook.state = final
        console.log('final',  final)
        scheduleRender();
    }

    if(!oldHook){
        if(currentIndex === 0)fiber.memoizeState = newHook;
        else {
            let prev = fiber.memoizeState;
            for(let i=0; i< currentIndex-1; i++)prev =prev.next;
            prev.next = newHook;
        }
    }

    hookIndex++;
    return [newHook.state, setState]
}

function useState(initValue) {
  const currentIndex = hookIndex;

  // 遍历链表找到当前索引对应的 Hook 节点
  let prevHook = null;
  let currentHook = fiber.memoizeState;
  for (let i = 0; i < currentIndex; i++) {
    if (!currentHook) break;
    prevHook = currentHook;
    currentHook = currentHook.next;
  }

  let hook;
  if (currentHook) {
    // 复用已有节点
    hook = currentHook;
  } else {
    // 创建新节点
    hook = { state: initValue, next: null };
    if (prevHook) {
      prevHook.next = hook;
    } else {
      fiber.memoizeState = hook;
    }
  }

  const setState = (newValue) => {
    const final = typeof newValue === 'function' ? newValue(hook.state) : newValue;
    if (final === hook.state) return;
    hook.state = final;
    scheduleRender(); // 触发重新渲染
  };

  hookIndex++;
  return [hook.state, setState];
}

function useEffect(cb, deps){
  const currentIndex=hookIndex;
  let prev = null;
  let oldHook = fiber.memoizeState;
  for(let i=0;i<currentIndex;i++){
    prev=oldHook
    oldHook=oldHook.next;
  }

  const shouldSkip = oldHook && deps && oldHook.deps.every((dep,i)=>deps[i]===dep);

  const newHook = {
    callback:cb,
    deps,
    destroy: oldHook?.destroy,
    next: null
  }

  if(prev){
    prev.next = newHook
  }else{
    fiber.memoizeState= newHook
  }

  if(!shouldSkip){
    newHook.next= fiber.nextEffect;
    fiber.nextEffect= newHook
  }

  hookIndex++

}

function useRef(initValue){
  const currentHook= hookIndex;
  let prev = null
  let oldHook = fiber.memoizeState;
  for(let i=0;i< currentHook;i++){
    prev= oldHook;
    oldHook=oldHook.next;
  }
  if(!oldHook){
    const newHook={
      current:initValue,
      next: null
    }
    if(prev)prev.next=newHook
    else fiber.memoizeState=newHook
    hookIndex++
    return newHook
  }
  hookIndex++
  return oldHook
}

// ========== 测试代码 ==========
function App() {
  const [count, setCount] = useState(0);
  const [time, setTime] = useState('time');
   const countRef = useRef(count);
  countRef.current = count; // 每次渲染同步最新值
  console.log('当前渲染快照：count =', count);

  useEffect(() => {
    console.log('每次渲染后执行，当前count：', count,time);
  });

  const handleClick = () => {
    console.log('点击时捕获的count：', count);
    setCount(count + 1);
    setTime(time + 1);
    setTimeout(() => console.log('1秒后打印的count：', count), 1000);
    setTimeout(() => console.log('1秒后打印的time', time), 1000);
  };


  // 模拟首次渲染后点击按钮
  if (count === 0||count === 1) setTimeout(handleClick, 1000);
  return { onClick: handleClick };
}

// 启动首次渲染
scheduleRender();