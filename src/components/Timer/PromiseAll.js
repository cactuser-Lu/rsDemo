

function promiseAll(promises){
    return new Promise((resolve,reject)=>{
        if(!promises.length)return resolve([])
        const res=Array(promises.length)
        let cnt=0

        promises.forEach((promise,i) => {
            Promise.resolve(promise).then(
                value=>{
                    res[i]=value
                    cnt++
                    if(cnt===promises.length)resolve(res)
                },
                reason=>reject(reason)
            )
        });
    })
}

function promiseAllSettled(promises){
    
    return new Promise((resolve,reject)=>{
        if(!promises.length)return resolve([])
        const res=Array(promises.length)
        let cnt=0
        promises.forEach((promise,i)=>{
            Promise.resolve(promise).then(
                value=>{
                    res[i]=value
                    cnt++
                    if(cnt===promises.length)resolve(res)
                },
                reason=>{
                    res[i]=reason
                    cnt++
                    if(cnt===promises.length)resolve(res)
                }
            )
        })
    })

}

function race(promises){
    return new Promise((resolve,reject)=>{
        promises.forEach(promise=>{
            Promise.resolve(promise).then(resolve,reject)
        })
    })
}
function promiseAny(promises){
    if(!promises.length)return resolve([])
    const res=Array(promises.length)
    let cnt=0
    return new Promise((resolve,reject)=>{
        promises.forEach((promise,i)=>{
            Promise.resolve(promise).then(resolve,reason=>{
                res[i]=reason
                cnt++
                if(res.length==cnt)reject(res)
            })
        })
    })
}

const ps=[
    new Promise(resolve=>{
        setTimeout(()=>resolve(1),5000)
    }),
    new Promise(resolve=>{
        setTimeout(()=>resolve(2),3000)
    }),
    new Promise((resolve,reject)=>{
        setTimeout(()=>reject(100),2000)
    }),
    new Promise(resolve=>{
        setTimeout(()=>resolve(3),3000)
    }),
]

// promiseAll(ps).then(res=>{
//     console.log(res)
// },reason=>{
//     console.log(reason,2)
// })
// .catch(e=>{
//     console.log(e)
// })

// race(ps).then(res=>{
//     console.log(res)
// },()=>{})
// promiseAllSettled(ps).then(res=>{
//     console.log(res)
// })
promiseAny(ps).then(res=>{
     console.log(res)
})