/* 서비스 워커 — 앱 셸을 캐시해 오프라인에서도 동작. 배포 시 VERSION을 올리면 캐시가 교체된다. */
const VERSION='wardrobe-v1.2.0';
const SHELL=['./','./index.html','./manifest.webmanifest','./css/app.css',
  './js/app.js','./js/const.js','./js/util.js','./js/db.js','./js/store.js','./js/seed.js','./js/garments.js','./js/recommend.js','./js/image.js','./js/backup.js',
  './js/ui/common.js','./js/ui/wardrobe.js','./js/ui/coord.js','./js/ui/log.js','./js/ui/sheets.js',
  './assets/fonts/Pretendard-Subset.woff2','./assets/fonts/Archivo-Logo.woff2',
  './assets/icons/icon-192.png','./assets/icons/icon-512.png','./assets/icons/maskable-512.png','./assets/icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET' || new URL(r.url).origin!==location.origin) return;
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(hit=>hit || fetch(r).then(res=>{
    if(res.ok){ const cp=res.clone(); caches.open(VERSION).then(c=>c.put(r,cp)); }
    return res;
  }).catch(()=> r.mode==='navigate' ? caches.match('./index.html') : Response.error())));
});
