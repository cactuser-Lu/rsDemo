import React, { useState, useEffect } from "react";
// 模拟抢券接口
const mockClaimCoupon = () => {
  return new Promise((resolve) => {
    // 模拟接口延迟
    setTimeout(() => {
      // 随机模拟成功或失败
      resolve(Math.random() > 0.3);
    }, 800);
  });
};
const Timer = () => {
  const [countdown, setCountdown] = useState(10); // 倒计时秒数
  const [canClaim, setCanClaim] = useState(false); // 是否可抢券
  const [isClaiming, setIsClaiming] = useState(false); // 是否正在请求
  const [result, setResult] = useState(""); // 抢券结果

  useEffect(() => {
    if (countdown <= 0) setCanClaim(true);
    else {
      const Timer = setTimeout(() => {
        setCountdown((pre) => pre - 1);
      }, 1000);
      return ()=>clearTimeout(Timer);
    }
  }, [countdown]);

  const handleClaim=async()=>{
    if(!canClaim||isClaiming||result)return;
    setIsClaiming(true);
    try{
      const res=await mockClaimCoupon();
      setResult(res?'抢券成功':'手慢了，券已被抢光~')
    }catch(err){
      setResult(err)
    }finally{
      setIsClaiming(false)
    }
  }

  return (
    <div>
      {countdown > 0 ? (
        <div>倒计时{countdown}S</div>
      ) : canClaim && !result ? (
        <button
        onClick={handleClaim}
        disabled={isClaiming}
        >
          {isClaiming?'抢券中....':'立即抢券'}
        </button>
      ) : (
        <>{result}</>
      )}
    </div>
  );
};

export default Timer;