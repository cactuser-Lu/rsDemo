import { url } from 'node:inspector';
import React, { useState, useEffect } from 'react';

export function useFetch(url,params){

    const [data,setData]= useState(null)
    const [loading, setLoading] = useState(true)
    const [error,setError]  = useState(null)

    const fetchData=()=>{
        setLoading(true);
        setError(null);

        let url = url;
        if(params){
            const query = new URLSearchParams(params).toString();
            url=`${url}?${query}`
        }
        fetch(url).then(setData).catch(setError).finally(()=>setLoading(false))
    }
    
    useEffect(async()=>{
        fetchData()
    },[url,params])

    return {data,loading,error}
}