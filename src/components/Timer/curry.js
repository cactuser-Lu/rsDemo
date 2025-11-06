

function add(...args){
    const arg=[...args]
    function curry(...newArgs){
        if(newArgs.length==0)return arg.reduce((a,b)=>a+b)
        
        arg.push(...newArgs)
        return curry
    }
    return curry
}

console.log(add(1,2,3)(4)())

function flatten(arr){
    let res=[]
    for(let i=0;i<arr.length;i++){
        if(Array.isArray(arr[i]))res=res.concat(flatten(arr[i]))
        else res.push(arr[i])
    }
    return res
}
let res=flatten([1,[1,2,30,[5]],4])
console.log(res)

function flattenStack(arr){
    let res=[]
    let stack=[...arr]
    while(stack.length){
        const item = stack.shift()
        if(Array.isArray(item))stack.unshift(...item)
        else res.push(item)
    }
    return res

}
let res1=flattenStack([1,[1,2,30,[5]],4])
console.log(res1)

function filterUn(arr){
    return [...new Set(arr)]
}
console.log(filterUn([1,1,1,1]))