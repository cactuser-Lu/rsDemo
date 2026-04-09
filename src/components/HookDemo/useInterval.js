import { useRef,useEffect } from 'react';

function useInterval(callback, delay = 1000) {
  const callbackRef = useRef();
  useEffect(()=>{
    callbackRef.current=callback
  },[callback])
  
  useEffect(()=>{
    const intervalId =setInterval(() => {
        callbackRef.current();
      }, delay);
    return () =>clearInterval(intervalId)
  },[delay])
}

export default useInterval;