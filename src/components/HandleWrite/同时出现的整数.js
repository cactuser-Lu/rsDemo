

const getRes= (arr1,arr2)=>{
    const ma1={}
    const ma2={}
    arr1=arr1.sort()
    arr2=arr2.sort()

    arr1.forEach(i => {
        if(ma1[i])ma1[i]++
        else ma1[i]=1
    });

    arr2.forEach(i => {
        if(ma2[i])ma2[i]++
        else ma2[i]=1
    });

    const res=new Map()
    for(let i=0;i<arr1.length;i++){
        let cur=arr1[i]
        while(i>0&&cur==arr1[i-1]){
            i++;
            cur=arr1[i]
        }
        if(ma2[cur]){
            const a=Math.min(ma1[cur],ma2[cur])
            // console.log(ma1[cur],ma2[cur],a,res.get(a),res.has(a))
            if(res.has(a)) res.get(a).push(cur)
            else res.set(a, [cur])
        }
    }
    // console.log(res)
    for(let [k,v] of res){
        console.log(k,':',v.sort((a,b)=>a-b))
    }
}

let a=[5,8,11,3,6,8,8,-1,11,2,11,11]
let b=[11,2,11,8,6,8,8,-1,8,15,3,-9,11]

getRes(a,b)