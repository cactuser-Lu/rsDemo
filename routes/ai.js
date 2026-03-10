const express = require('express');

const router = express.Router();

// 模拟 AI 响应库
const aiResponses = {
  greeting: '你好！我是您的 AI 助手。有什么我可以帮助您的吗？',
  how_are_you: '我很好，感谢您的关心！作为一个 AI 助手，我随时准备帮助您解决问题。',
  help: '我可以帮助您进行多种任务，比如：\n- 回答问题\n- 讨论话题\n- 提供建议\n- 进行创意写作\n\n请告诉我您需要什么帮助？',
  default: '这是一个很有趣的问题！让我为您详细解答...'
};

// 生成对话响应
const generateAIResponse = (message) => {
  const msg = message.toLowerCase().trim();
  
  if (msg.includes('你好') || msg.includes('hello') || msg.includes('hi')) {
    return aiResponses.greeting;
  } else if (msg.includes('怎么样') || msg.includes('how are you')) {
    return aiResponses.how_are_you;
  } else if (msg.includes('帮助') || msg.includes('help')) {
    return aiResponses.help;
  }
  
  return aiResponses.default + `\n\n您的问题是："${message}"\n\n这是一个很值得思考的问题。根据我的分析，我认为...`;
};

/**
 * GET /api/ai/chat
 * SSE 流式对话接口
 * 查询参数: message (用户消息)
 */
router.get('/chat', (req, res) => {
  const { message } = req.query;

  if (!message) {
    return res.status(400).json({ code: 1, msg: '缺少message参数' });
  }

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // 生成 AI 响应
  const aiResponse = generateAIResponse(message);
  
  // 模拟字符流发送（打字机效果）
  let index = 0;
  const chunkSize = 2; // 每次发送的字符数

  const sendChunk = () => {
    if (index < aiResponse.length) {
      const chunk = aiResponse.slice(index, index + chunkSize);
      res.write(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`);
      index += chunkSize;
      
      // 模拟网络延迟，创建打字机效果
      setTimeout(sendChunk, Math.random() * 100 + 50);
    } else {
      // 发送完成信号
      res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
      res.end();
    }
  };

  // 开始发送消息
  sendChunk();
});

module.exports = router;
