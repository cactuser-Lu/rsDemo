// 实现一个函数，数字1在1秒后输出，数字2在数字1输出后2秒后输出，
// 数字3在数字2输出后3秒后输出，以此类推
// 输出数字1,2,3,4,5,6,7,8,9,10
function timer(i) {
    if (i > 10) return; // 结束条件
    setTimeout(() => {
        console.log(i);
        timer(i + 1);
    }, i * 1000);
}
// timer(1);
function timerWithRAF(arr){
    let index=0;
    const start=performance.now();
    function step(timestamp){
        const nowIndex=Math.floor((timestamp-start)/1000);
        if(nowIndex>index&&nowIndex<arr.length){
            console.log(arr[nowIndex]);
            index++;
        }
        if(nowIndex<arr.length-1) requestAnimationFrame(step)

    }
    requestAnimationFrame(step)

}
const arr=[1,2,3,4,5,6,7,8,9,10]
timerWithRAF(arr)