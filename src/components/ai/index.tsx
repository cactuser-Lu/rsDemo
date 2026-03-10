import React, { useState, useCallback } from 'react';
import { Message, createMessage } from './utils/message';
import { connectSSE,connectSSEWithFetch } from './utils/sse';
import { MessageList } from './sse/MessageList';
import { ChatInput } from './sse/ChatInput';
import './ChatApp.css';

export const ChatApp: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  let currentAssistantMessage = '';
  let unsubscribeSSE: (() => void) | null = null;

  const handleSendMessage = useCallback((userMessage: string) => {
    // 添加用户消息
    const userMsg = createMessage(userMessage, 'user');
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // 创建助手消息占位符
    const assistantMsg = createMessage('', 'assistant');
    currentAssistantMessage = '';
    
    setMessages((prev) => [...prev, assistantMsg]);

    // 连接 SSE
    unsubscribeSSE = connectSSEWithFetch(userMessage, {
      onChunk: (chunk) => {
        currentAssistantMessage += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            updated[updated.length - 1] = {
              ...lastMsg,
              content: currentAssistantMessage
            };
          }
          return updated;
        });
      },
      onDone: () => {
        setIsLoading(false);
      },
      onError: (error) => {
        console.error('聊天错误:', error);
        setMessages((prev) => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            updated[updated.length - 1] = {
              ...lastMsg,
              content: `错误: ${error.message}`
            };
          }
          return updated;
        });
        setIsLoading(false);
      }
    });
  }, []);

  return (
    <div className="chat-app">
      <div className="chat-header">
        <h1>🤖 AI 聊天助手</h1>
        <p>通过 SSE 技术实现实时流式对话</p>
      </div>
      <MessageList messages={messages} isLoading={isLoading} />
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default ChatApp;
