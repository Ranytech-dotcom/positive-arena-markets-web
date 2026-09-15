const CACHE='pa-football-v12';
const APP_URL='./index.html';
const SHELL=['./','./index.html','./login.html','./trial-expired.html','./styles.css','./app.js','./auth.js','./notifications.js','./ui-polish.css','./ui-polish.js','./member-watchlist-v2.js','./cleanup.js','./admin.html','./admin.css','./admin.js','./manifest.webmanifest','./icon.svg','./offline.html'];

self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});

self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?.json?.()||{};}catch{try{data={body:event.data?.text?.()||''};}catch{}}
  const title=data.title||'⚽ Positive Arena Football';
  const options={body:data.body||'A new football update is available.',icon:'./icon.svg',badge:'./icon.svg',tag:data.tag||'positive-arena-football',renotify:true,data:{...data,url:data.url||APP_URL}};
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  let target;
  try{target=new URL(event.notification?.data?.url||APP_URL,self.registration.scope);if(target.origin!==self.location.origin)target=new URL(APP_URL,self.registration.scope);}catch{target=new URL(APP_URL,self.registration.scope);}
  event.waitUntil((async()=>{
    const list=await clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of list){
      if(new URL(client.url).origin===target.origin){if('navigate' in client)await client.navigate(target.href);return client.focus();}
    }
    return clients.openWindow(target.href);
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