// worker.js - Web Worker 代码
self.onmessage = function(e) {
    // 接收主线程发送的数据
    const { a, b } = e.data;
    
    // 模拟耗时计算
    let sum = 0;
    for (let i = 0; i < 1000000000; i++) {
        sum += i % 100;
    }
    
    // 发送结果回主线程
    self.postMessage(a + b);
};    