/**
 * 手写红绿灯
 */
const p = (i) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(i)
      resolve();
    }, 1000);
  });
};

const init=async ()=>{
    await p('green')
    await p('red')
    await p('yellow')
    init()
}
init()