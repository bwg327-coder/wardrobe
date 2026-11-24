/* 서비스 워커 — 네트워크 우선: 온라인이면 항상 최신 파일, 오프라인이면 캐시로 동작.
   새 버전 배포 시 VERSION을 올리면 이전 캐시를 지운다. */
const VERSION='wardrobe-v1.3.2';
const SHELL=['./','./index.html','./manifest.webmanifest','./css/app.css',
  './js/app.js','./js/const.js','./js/util.js','./js/db.js','./js/store.js','./js/seed.js','./js/garments.js','./js/recommend.js','./js/image.js','./js/backup.js',
  './js/ui/common.js','./js/ui/wardrobe.js','./js/ui/coord.js','./js/ui/log.js','./js/ui/sheets.js',
  './assets/fonts/Pretendard-Subset.woff2','./assets/fonts/Archivo-Logo.woff2',
  './assets/icons/icon-192.png','./assets/icons/icon-512.png','./assets/icons/maskable-512.png','./assets/icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{
  // HTTP 캐시를 거치지 않고 서버에서 새로 받아 저장
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET' || new URL(r.url).origin!==location.origin) return;
  e.respondWith(fetch(r,{cache:'no-cache'}).then(res=>{
    if(res.ok){ const cp=res.clone(); caches.open(VERSION).then(c=>c.put(r,cp)); }
    return res;
  }).catch(()=>caches.match(r,{ignoreSearch:true}).then(hit=>hit || (r.mode==='navigate'? caches.match('./index.html') : Response.error()))));
});
