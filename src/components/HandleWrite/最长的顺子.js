
// 3-3-3-3-4-4-5-5-6-7-8-9-10-J-Q-K-A
// 4-5-6-7-8-8-8
const getChain=(str1,str2)=>{
    const ma ={
        'J':11,
        'Q':12,
        'K':13,
        'A':14
    }
    const ma2 ={
        11:'J',
        12:'Q',
        13:'K',
        14:'A'
    }
    const arr1= str1.split('-').map(item=>ma[item]?ma[item]:Number(item))
    const arr2= str2.split('-').map(item=>ma[item]?ma[item]:Number(item))

    const out =Array(15).fill(4)
    arr1.forEach(i=>out[i]--);
    arr2.forEach(i=>out[i]--);

    let res=[]
    for(let i=3;i<15;i++){
        let cur= out[i];
        let tmp=[]
        while(cur){
            tmp.push(i)
            i++
            cur= out[i]
        }
        if(tmp.length>=5&&tmp.length>res.length){
            res=[...tmp]
        }
        
    }

    return res.length?res.map(item=>ma2[item]?ma2[item]:item).join('-'):'NO-CHAIN'
}
const a= '3-3-3-3-4-4-5-5-6-7-8-9-10-J-Q-K-A'
const b= '4-5-6-7-8-8-8'
const res= getChain(a,b)
console.log(res)