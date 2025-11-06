// service-worker.js

// 缓存名称，用于版本控制
const CACHE_NAME = 'static-cache-v1';

// 需要缓存的资源列表
const urlsToCache = [
    '/',
    '/serviceWorker.html',
    'https://picsum.photos/400/200' // 示例图片
];

// 安装阶段：缓存静态资源
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

// 激活阶段：清理旧缓存
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.filter(cacheName => cacheName !== CACHE_NAME)
                        .map(cacheName => caches.delete(cacheName))
                );
            })
            .then(() => self.clients.claim())
    );
});

// 拦截请求：使用缓存或网络
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // 如果缓存中存在请求的资源，则返回缓存
                if (response) {
                    return response;
                }
                
                // 否则从网络获取
                return fetch(event.request);
            })
    );
});    