// Version is replaced with a build content hash by Vite.
const CACHE = 'detailflow-static-__BUILD_ID__';
const OFFLINE = '/offline.html';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([OFFLINE, '/icons/app-192.png', '/icons/app-512.png'])));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('detailflow-static-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => { if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || request.headers.has('authorization')) return;
  // Session callbacks, API responses, HTML and studio records are never cached.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE)));
    return;
  }
  if (!/^\/assets\/[^/]+-[\w-]+\.(?:js|css|woff2)$/.test(url.pathname) || url.search) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
    return response;
  }));
});
self.addEventListener('push', event => {
 let payload={};try{payload=event.data?.json()||{}}catch{}
 event.waitUntil(self.registration.showNotification(typeof payload.title==='string'?payload.title:'Detailflow', {body:typeof payload.body==='string'?payload.body:'',icon:'/icons/app-192.png',badge:'/icons/app-192.png',tag:typeof payload.tag==='string'?payload.tag:'detailflow',data:{url:'/app'}}));
});
self.addEventListener('notificationclick', event => {
 event.notification.close();
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{const existing=windows.find(client=>new URL(client.url).origin===self.location.origin&&new URL(client.url).pathname==='/app');if(existing)return existing.focus();return self.clients.openWindow('/app')}));
});
