// 💡 2026-11-28: v4 — 예전(v3)에는 모든 요청(학생 앱 서버 자료 · PDF · 그림)을 캐시에 쌓아
//    휴대폰 저장 공간이 차면 브라우저가 사이트 자료(로그인 포함)를 통째로 지워 학생이 '튕겼다'.
//    이제 앱 껍데기(화면 · 스타일 · 아이콘)만 캐시하고, 이름을 바꿔 쌓인 예전 캐시를 지운다.
const CACHE_NAME = 'logyedu-app-v4';
const urlsToCache = [
  './index.html',
  './tailwind.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];
// 캐시해 두는 것: 이 사이트의 화면 · 스타일 · 아이콘 · 매니페스트만(주소 끝으로 판단)
const SHELL = /(\/|\.html|\.css|manifest\.json|icon-\d+\.png)$/;

self.addEventListener('install', event => {
  // 💡 새 서비스워커를 받는 즉시 활성화 (기존 탭이 닫힐 때까지 기다리지 않음)
  self.skipWaiting();
  // 하나가 실패해도 새 워커는 꼭 설치되게(그래야 예전 캐시를 지운다)
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(urlsToCache.map(u => cache.add(u).catch(() => {}))))
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
  const req = event.request;
  // 💡 학생 앱 서버(onrender) 요청 · 다른 사이트 · POST 등은 건드리지 않고 그대로 보낸다(캐시에 쌓지 않음)
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const isPage = req.mode === 'navigate';
  if (!isPage && !SHELL.test(url.pathname)) return;
  // 네트워크 우선: 새로 배포한 화면을 바로 받고, 인터넷이 끊겼을 때만 캐시로 연다
  event.respondWith(
    fetch(req)
      .then(response => {
        if (response && response.ok && response.type === 'basic') {
          const clone = response.clone();
          // 페이지는 주소(?code= 등)와 상관없이 index.html 한 칸에만 둔다 — 캐시가 늘어나지 않게
          const key = isPage ? './index.html' : req;
          caches.open(CACHE_NAME).then(cache => cache.put(key, clone)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(isPage ? './index.html' : req).then(r => r || caches.match('./index.html')))
  );
});
