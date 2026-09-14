const CACHE='pa-gold-pwa-v1';
const SHELL=[
  './','./index.html','./login.html','./history.html','./calendar.html','./settings.html',
  './forgot-password.html','./reset-password.html','./trial-expired.html','./validation.html',
  './styles.css','./app.js','./auth.js','./pwa.js','./manifest.webmanifest','./favicon.svg',
  './icon-192.svg','./icon-512.svg','./offline.html'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);

  // Never cache live market/auth/API responses or third-party chart resources.
  if(url.origin!==self.location.origin){return;}
  if(url.pathname.includes('/functions/v1/')||url.pathname.includes('/auth/v1/')||url.pathname.includes('/rest/v1/'))return;

  if(req.mode==='navigate'){
    event.respondWith(
      fetch(req).then(res=>{
        const copy=res.clone();
        caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{});
        return res;
      }).catch(async()=>await caches.match(req)||await caches.match('./offline.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached=>cached||fetch(req).then(res=>{
      if(res.ok){const copy=res.clone();caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{});}
      return res;
    }))
  );
});
