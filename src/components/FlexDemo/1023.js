let wsInstance = null;
const onMessageCallbacks = [];
export default function useWebSocket(url) {
  const connect = () => {
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      return;
    }
    wsInstance = new WebSocket(url);
    wsInstance.onopen = () => {
      console.log("WebSocket connected");
    };

    wsInstance.onmessage = (event) => {
      let eventData = JSON.parse(event.data);
      let code = eventData.code;
      switch (code) {
        case 1000:
          onMessageCallbacks.forEach((callback) => {
            if (callback) callback(eventData);
          });
          break;
      }
    };
  };

  const onMessage = (callback) => {
    if (!onMessageCallbacks.includes(callback)) {
      onMessageCallbacks.push(callback);
    }
    // 返回取消订阅函数
    return () => {
      const index = onMessageCallbacks.indexOf(callback);
      if (index > -1) {
        onMessageCallbacks.splice(index, 1);
      }
    };
  };
  return {connect,onMessage}
}

const ws=useWebSocket('')
ws.connect();
//观察者模式
const unsubscribe=ws.onMessage(()=>{
    //自己的回调函数
})

//最后进行卸载
unsubscribe()