const mergeSort=(nums)=>{
    if(nums.length<2)return nums;
    const mid=Math.floor(nums.length/2);
    const left=nums.slice(0,mid)
    const right=nums.slice(mid)

    return merge(mergeSort(left),mergeSort(right))
}
const merge=(left,right)=>{
    let res=[];
    let l=0,r=0;
    while(l<left.length&&r<right.length){
        if(left[l]<right[r]){
            res.push(left[l]);
            l++
        }else{
            res.push(right[r]);
            r++;
        }
    }
    if(l<left.length)res=res.concat(left.slice(l));
    if(r<right.length)res=res.concat(right.slice(r));
    return res;
}

const res=mergeSort([5,2,3,1,4]);
console.log(res); // [1,2,3,4,5]

function deepClone(obj,hash=new WeakMap()){
    if(obj===null || typeof obj === 'object')return obj
    if(hash.has(obj))return hash.get(obj)

    const res = Array.isArray(obj)?[]:{}
    hash.set(obj,res)
    Object.keys(obj).forEach(key=>{
        res[key]=deepClone(obj[key],hash)
    })

    return res
}