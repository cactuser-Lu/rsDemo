import { useState,useReducer } from 'react'

const initialState ={
  count :0,
}

const reducer=(state,action)=>{
    switch(action.type){
        case 'increment':
            return {count: state.count+1}
        case 'decrement':
            return {count: state.count-1}
        default:
            return state
    }
}

const ReducerDemo=()=>{
    const [count, setCount]=useState(0)
    const [state,dispatch] =useReducer(reducer,initialState)
     return (
    <>
      <p>Count:{state.count}</p>
      <input type="text" value={count} onChange={(e)=>setCount(e.target.value)}/>
      <button onClick={()=>dispatch({type:'increment'})}> +1 </button>
      <button onClick={()=>dispatch({type:'decrement'})}> -1</button>
    </>
  )
}

export default ReducerDemo