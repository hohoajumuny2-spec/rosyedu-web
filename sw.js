const CACHE_NAME = 'logyedu-app-v2';
const urlsToCache = [
  './index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  // 💡 새 서비스워커를 받는 즉시 활성화 (기존 탭이 닫힐 때까지 기다리지 않음)
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  // 💡 예전 버전의 캐시(logyedu-app-v1 등)를 정리하고, 열려있는 탭도 즉시 새 워커가 제어하도록 함
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// 💡 학생 휴대폰으로 새 과제·모의고사·퀴즈·공지·채점 결과를 바로 알려준다.
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data ? event.data.text() : '' }; }
  const title = data.title || '로지에듀';
  const options = {
    body: data.body || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: data.tag || 'logyedu',
    data: { url: data.url || './' },
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// 알림을 누르면 이미 열려 있는 탭이 있으면 그걸 앞으로, 없으면 새로 연다
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) { c.navigate(url).catch(() => {}); return c.focus(); }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

self.addEventListener('fetch', event => {
  // 💡 네트워크 우선(Network First) 전략으로 변경.
  // 예전에는 캐시 우선이라, 새 버전을 배포해도 한 번 방문한 기기(특히 홈 화면에 추가한 PWA)는
  // index.html을 계속 예전 버전으로만 보여주는 문제가 있었음.
  // 이제는 항상 최신 버전을 먼저 시도하고, 오프라인이거나 네트워크 실패 시에만 캐시를 사용.
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
