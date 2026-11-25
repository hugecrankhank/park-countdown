const CACHE='park-day-integrated-__BUILD_VERSION__';
const FILES=['./','./index.html','./integration.js','./companion.html','./companion.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil((async()=>{
 const c=await caches.open(CACHE);
 await c.addAll(FILES.map(f=>new Request(new URL(f,self.registration.scope),{cache:'reload'})));
 await self.skipWaiting();
})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(k=>(k.startsWith('park-day-v2-preview-')||k.startsWith('park-day-integrated-'))&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url),scope=new URL(self.registration.scope);
 // Version checks must always reach the network; never use an offline version.
 if(e.request.method!=='GET'||u.origin!==scope.origin||!u.pathname.startsWith(scope.pathname)||u.pathname.includes('/api/')||u.pathname.endsWith('/version.txt'))return;
 const shell=FILES.some(f=>new URL(f,scope).pathname===u.pathname);
 e.respondWith(fetch(e.request,shell?{cache:'no-store'}:undefined).catch(async()=>{
  const c=await caches.open(CACHE);
  const r=await c.match(e.request,{ignoreSearch:true});
  return r||Response.error();
 }));
});
