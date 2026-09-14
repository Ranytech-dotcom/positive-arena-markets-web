const CACHE='pa-football-v6';
const APP_URL='./index.html';
const SHELL=['./','./index.html','./login.html','./trial-expired.html','./styles.css','./app.js','./auth.js','./admin.html','./admin.css','./admin.js','./manifest.webmanifest','./icon.svg','./offline.html'];

self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});

self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?.json?.()||{};}catch{try{data={body:event.data?.text?.()||''};}catch{}}
  const title=data.title||'⚽ Positive Arena Football';
  const options={body:data.body||'A new football Core signal is available.',icon:'./icon.svg',badge:'./icon.svg',tag:data.tag||'positive-arena-football',renotify:true,data:{...data,url:APP_URL}};
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(APP_URL,self.registration.scope).href;
  event.waitUntil((async()=>{
    const list=await clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of list){
      if(new URL(client.url).origin===new URL(target).origin){if('navigate' in client)await client.navigate(target);return client.focus();}
    }
    return clients.openWindow(target);
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const url=new URL(req.url);if(url.origin!==self.location.origin)return;
  if(url.pathname.includes('/functions/v1/')||url.pathname.includes('/auth/v1/')||url.pathname.includes('/rest/v1/'))return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});return res;}).catch(async()=>await caches.match(req)||await caches.match('./offline.html')));
    return;
  }
  event.respondWith(fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});}return res;}).catch(()=>caches.match(req)));
});
