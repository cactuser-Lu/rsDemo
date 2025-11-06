// 1. 定义请求池（存储 pending 状态的请求）和缓存
const pendingRequests = new Map(); // key: 请求唯一标识, value: Promise
const responseCache = new Map(); // 缓存已完成的请求结果

// 2. 生成请求的唯一标识（基于 url、method、参数）
const getRequestKey = (config) => {
  const { url, method = 'get', params, data } = config;
  // 序列化参数（确保参数顺序不影响 key 生成）
  const paramsStr = params ? JSON.stringify(Object.entries(params).sort()) : '';
  const dataStr = data ? JSON.stringify(Object.entries(data).sort()) : '';
  return `${method}-${url}-${paramsStr}-${dataStr}`;
};

// 3. 模拟网络请求（替代 axios）
const mockRequest = (config) => {
  return new Promise((resolve) => {
    // 模拟网络延迟（1秒后返回数据）
    setTimeout(() => {
      // 模拟返回数据（包含请求参数，方便验证）
      resolve({
        data: {
          message: `请求成功: ${config.url}`,
          timestamp: Date.now(),
          params: config.params || config.data || {}
        }
      });
    }, 1000);
  });
};

// 4. 封装请求合并工具
const request = async (config) => {
  const requestKey = getRequestKey(config);

  // 先检查缓存，有缓存直接返回
  if (responseCache.has(requestKey)) {
    console.log(`[缓存命中] ${requestKey}`);
    return responseCache.get(requestKey);
  }

  // 检查请求池：若已有相同请求在 pending，直接返回其 Promise
  if (pendingRequests.has(requestKey)) {
    console.log(`[请求合并] 复用 pending 请求: ${requestKey}`);
    return pendingRequests.get(requestKey);
  }

  // 无缓存且无 pending 请求，发起新请求
  console.log(`[发起请求] ${requestKey}`);
  const requestPromise = mockRequest(config)
    .then((response) => {
      // 请求成功：存入缓存
      responseCache.set(requestKey, response.data);
      return response.data;
    })
    .catch((error) => {
      // 请求失败：清除缓存和请求池记录
      responseCache.delete(requestKey);
      throw error;
    })
    .finally(() => {
      pendingRequests.delete(requestKey);
    });

  // 将新请求的 Promise 存入请求池
  pendingRequests.set(requestKey, requestPromise);

  return requestPromise;
};

// 5. 使用示例（模拟多个组件同时请求）
const fetchUser = (userId) => {
  return request({
    url: `/api/user/${userId}`,
    method: 'get',
    params: { userId }
  });
};

const fetchArticle = (articleId) => {
  return request({
    url: `/api/article/${articleId}`,
    method: 'post',
    data: { articleId }
  });
};

// 模拟 3 个组件同时请求同一个用户数据
console.log('=== 开始测试用户请求 ===');
const componentA = async () => {
  console.log('组件A请求用户数据');
  const data = await fetchUser(123);
  console.log('组件A收到结果:', data.message);
};

const componentB = async () => {
  console.log('组件B请求用户数据');
  const data = await fetchUser(123);
  console.log('组件B收到结果:', data.message);
};

const componentC = async () => {
  console.log('组件C请求用户数据');
  const data = await fetchUser(123);
  console.log('组件C收到结果:', data.message);
};

// 同时触发三个相同请求
componentA();
componentB();
componentC();

// 2秒后模拟新的请求（验证缓存）
setTimeout(() => {
  console.log('\n=== 2秒后测试缓存 ===');
  fetchUser(123).then(data => {
    console.log('缓存请求结果:', data.message);
  });
}, 2000);

// 测试不同请求（不应合并）
setTimeout(() => {
  console.log('\n=== 测试不同请求 ===');
  fetchArticle(456).then(data => {
    console.log('文章请求结果:', data.message);
  });
}, 3000);
