interface SSEOptions {
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1秒
  maxDelay: 30000, // 30秒
  backoffMultiplier: 2,
};

export const connectSSE = (message: string, options: SSEOptions) => {
  let currentAttempt = 0;
  let delay = 1000;
  let timeoutId: NodeJS.Timeout | null = null;
  let isClosed = false;
  let eventSource: EventSource | null = null;

  const closeConnection = () => {
    isClosed = true;
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const connect = () => {
    eventSource = new EventSource(
      `http://localhost:3001/api/ai/chat?message=${encodeURIComponent(message)}`,
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.done) {
          eventSource?.close();
          options.onDone();
          closeConnection();
        } else {
          options.onChunk(data.content);
        }
      } catch (error) {
        options.onError(new Error("解析SSE数据失败"));
      }
    };

    eventSource.onerror = () => {
      if (isClosed) return;

      eventSource?.close();
      options.onError(new Error("SSE连接错误"));

      if (currentAttempt < DEFAULT_RETRY_CONFIG.maxRetries) {
        currentAttempt++;
        timeoutId = setTimeout(() => {
          connect();
        }, delay);
      } else {
        options.onError(new Error(`SSE连接失败，已重试${currentAttempt}次`));
        closeConnection();
      }
    };
  };

  connect();

  return closeConnection;
};
interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

// ==================== 方式2: Fetch + ReadableStream ====================
export const connectSSEWithFetch = (
  message: string,
  options: SSEOptions,
  retryConfig: Partial<RetryConfig> = {},
) => {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let currentAttempt = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  let abortController: AbortController | null = null;
  let isClosed = false;

  const closeConnection = () => {
    isClosed = true;
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  // 解析 SSE 格式的消息
  const parseSSELine = (line: string) => {
    if (!line.startsWith("data: ")) return null;
    const dataStr = line.slice(6); // 移除 "data: " 前缀
    try {
      return JSON.parse(dataStr);
    } catch {
      return null;
    }
  };

  // 高阶函数：创建 SSE 行处理器
  // buffer 和 decoder 在闭包中维持状态，跨 chunk 使用
  const createSSELineProcessor = () => {
    let buffer = "";
    const decoder = new TextDecoder();

    return {
      // 处理单个数据 chunk
      processChunk: (chunk: Uint8Array): boolean => {
        // if (dataEndReceived) return false;

        // 1. 转换字节为文本（stream: true 表示可能是多字节字符的中间部分）
        buffer += decoder.decode(chunk, { stream: true });

        // 2. 按换行符分割成行
        const lines = buffer.split("\n");

        // 3. 最后一行可能不完整，保留到下一个 chunk
        buffer = lines.pop() || "";

        // 4. 处理完整的行
        for (const line of lines) {
          // 空行是 SSE 中的消息分隔符，跳过
          if (!line.trim()) continue;

          const data = parseSSELine(line);
          if (!data) continue; // 不是 data 行，跳过

          // 检查终止信号（只设置标志，不立即调用 closeConnection）
          if (data.done) {
            // dataEndReceived = true;
            options.onDone();
            return false; // 返回 false 表示应该停止处理
          }

          // 处理数据块
          options.onChunk(data.content);
        }

        return true; // 返回 true 表示继续处理
      },

      // 处理流结束时的剩余数据
      flush: (): void => {
        // 最终解码（处理任何待处理的多字节字符）
        const finalText = decoder.decode();
        if (finalText.trim()) {
          const data = parseSSELine(finalText);
          if (data && !data.done) {
            options.onChunk(data.content);
          }
        }
      },
    };
  };

  const readStream = async (
    stream: ReadableStream<Uint8Array>,
    mode: 0 | 1 = 1,
  ) => {
    const processor = createSSELineProcessor();

    try {
      if (mode === 0) {
        // 方式1：使用 for await...of（如果浏览器支持）
        if (stream[Symbol.asyncIterator]) {
          for await (const chunk of stream) {
            const shouldContinue = processor.processChunk(chunk);
            // 如果接收到 done 信号，继续消耗流直到结束
            if (!shouldContinue ) {
              break;
            }
          }
        } else {
          throw new Error("浏览器不支持 for await...of");
        }
      } else if (mode === 1) {
        // 方式2：使用 getReader() + while 循环
        const reader = stream.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            const shouldContinue = processor.processChunk(value);
            // 如果接收到 done 信号，继续等待流自然结束（不中止）
            // 这样可以避免 AbortError
            if (!shouldContinue) {
              break;
            }
          }
        } finally {
          // 确保 reader 被正确释放
          reader.releaseLock();
        }
      }

      // 处理流结束时的剩余数据
      processor.flush();

      // 只有在没有被关闭的情况下才调用回调
      if (!isClosed) {
        options.onDone();
        closeConnection();
      }
    } catch (err) {
      if (!isClosed) {
        const errorMsg = err instanceof Error ? err.message : "未知错误";
        options.onError(new Error(`流读取错误: ${errorMsg}`));
        attemptReconnect();
      }
    }
  };

  const attemptReconnect = () => {
    if (isClosed) return;
    if (currentAttempt < config.maxRetries) {
      currentAttempt++;
      const delay = Math.min(
        config.initialDelay *
          Math.pow(config.backoffMultiplier, currentAttempt - 1),
        config.maxDelay,
      );
      timeoutId = setTimeout(() => {
        connect();
      }, delay);
    } else {
      closeConnection();
    }
  };

  const connect = async () => {
    if (isClosed) return;
    abortController = new AbortController();

    try {
      const response = await fetch(
        `http://localhost:3001/api/ai/chat?message=${encodeURIComponent(message)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "text/event-stream",
            Accept: "text/event-stream",
          },
          signal: abortController.signal,
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error("响应体为空");
      }

      // 重连成功，重置计数器
      currentAttempt = 0;

      // 读取流（mode 1: while 循环，mode 0: for await 循环）
      await readStream(response.body, 0);
    } catch (err) {
      if (isClosed) return;

      const errorMsg = err instanceof Error ? err.message : "未知错误";
      console.error("SSE 连接错误:", errorMsg);
      options.onError(new Error(`SSE连接错误: ${errorMsg}`));

      attemptReconnect();
    }
  };

  connect();

  return closeConnection;
};
