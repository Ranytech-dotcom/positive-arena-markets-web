const CACHE='pa-gold-pwa-v3';
const APP_URL='./index.html';
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

self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?.json?.()||{}}catch{
    try{data={body:event.data?.text?.()||''}}catch{}
  }
  const title=data.title||'Positive Arena Gold Alert';
  const options={
    body:data.body||'A new Gold signal update is available.',
    icon:'./icon-192.svg',
    badge:'./icon-192.svg',
    tag:data.tag||'positive-arena-gold',
    renotify:true,
    data:{...data,url:APP_URL}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(APP_URL,self.registration.scope).href;
  event.waitUntil((async()=>{
    const list=await clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of list){
      if(new URL(client.url).origin===new URL(target).origin){
        if('navigate' in client)await client.navigate(target);
        return client.focus();
      }
    }
    return clients.openWindow(target);
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);

  // Never cache live market/auth/API responses or third-party chart resources.
  if(url.origin!==self.location.origin){return;}
  if(url.pathname.includes('/functions/v1/')||url.pathname.includes('/auth/v1/')||url.pathname.includes('/rest/v1/'))return;

  // Always revalidate page navigations so members see UI changes immediately.
  if(req.mode==='navigate'){
    event.respondWith(
      fetch(req,{cache:'no-store'}).then(res=>{
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
