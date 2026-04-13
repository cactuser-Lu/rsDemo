// ``` javascript
// const scheduler = new Scheduler(2)

// const timer = (delay) => new Promise((resolve) => setTimeout(() => resolve()), delay)
// const addTask = (delay, order) => {
// scheduler.add(timer(delay)).then(() => consloe.log(order))
// }

// addTask(1000, '1')
// addTask(300, '2')
// addTask(500, '3')
// addTask(800, '4')

// // 应输出 '2', '3', '1', '4'
// ```