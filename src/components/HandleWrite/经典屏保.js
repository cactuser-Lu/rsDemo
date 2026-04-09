//800 600
//50  25

const getPosition=(x,y,t)=>{
    x+=t
    y+=t

    while(y+25>600|| y<0 || x+50>800 || x<0){
        if(y+25> 600)y=600- (y+25-600)-25
        if(x+50> 800)x= 1500- x
        if(y<0)y=-y
        if(x<0)x=-x
    }

    return [x,y]
}

// for(let i=0;i<26;i++){
//     console.log(String.fromCharCode('a'.charCodeAt()+i))
//     console.log(String.fromCharCode('A'.charCodeAt()+i))
// }
let num = 112345
console.log(num.toString(2))
