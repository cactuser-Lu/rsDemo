import React, { useState, useEffect } from 'react';
import './Timer.css';

const CircularProgressTimer = () => {
  const [inputTime, setInputTime] = useState(60); // 默认倒计时 60 秒
  const [timeLeft, setTimeLeft] = useState(0); // 当前剩余时间
  const [isRunning, setIsRunning] = useState(false); // 倒计时是否运行

  // 格式化时间为 MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 处理输入变化
  const handleInputChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0) {
      setInputTime(value);
      if (!isRunning) {
        setTimeLeft(value);
      }
    }
  };

  // 开始倒计时
  const startTimer = () => {
    if (timeLeft > 0 && !isRunning) {
      setIsRunning(true);
    }
  };

  // 重置倒计时
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(inputTime);
  };

  // 倒计时逻辑
  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  // 计算进度百分比
  const progress = (timeLeft / inputTime) * 100 || 0;

  return (
    <div className="timer-container">
      <h1>Circular Progress Timer</h1>
      <div className="progress-circle">
        <svg className="progress-ring" width="200" height="200">
          <circle
            className="progress-ring__background"
            cx="100"
            cy="100"
            r="90"
            strokeWidth="10"
          />
          <circle
            className="progress-ring__progress"
            cx="100"
            cy="100"
            r="90"
            strokeWidth="10"
            style={{
              strokeDashoffset: `${(1 - progress / 100) * 565.48}px`, // 565.48 = 2 * π * 90
              transition: `stroke-dashoffset ${isRunning ? '1s' : '0s'} linear`,
            }}
          />
        </svg>
        <div className="timer-display">{formatTime(timeLeft)}</div>
      </div>
      <div className="controls">
        <input
          type="number"
          value={inputTime}
          onChange={handleInputChange}
          min="0"
          disabled={isRunning}
          className="time-input"
        />
        <button onClick={startTimer} disabled={isRunning || timeLeft <= 0}>
          Start
        </button>
        <button onClick={resetTimer}>Reset</button>
      </div>
    </div>
  );
};

export default CircularProgressTimer;