

function query(arr){
    this.res=[...arr];

    this.where=(fun)=>{
        this.res=this.res.filter(fun)
        return this;
    }

    this.sortBy=(s)=>{
        this.res=this.res.sort((a,b)=>{
            return a[s]-b[s];
        })
        return this;
    }

    this.groupBy=(s)=>{
        const ma={};
        this.res.forEach(item=>{
            if(!ma[item[s]]){
                ma[item[s]]=[item]
            }else{
                ma[item[s]].push(item)
            }
        })
        this.res=Object.values(ma)
        return this;
    }

    this.execute=()=>this.res

    return this

}

let list=[
    {id:1,name:'a',age:10},
    {id:11,name:'a',age:10},
    {id:2,name:'b',age:14},
    {id:13,name:'b',age:15},
    {id:4,name:'b',age:16},
    {id:17,name:'c',age:17},
    {id:16,name:'c',age:18},
    {id:15,name:'c',age:19},
]

const result = query(list)
  .where(item => item.age > 8)
  .sortBy('id')
  .groupBy('name')
  .execute();

console.log(result);