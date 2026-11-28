/* Additive integration: original code, CSS, and storage remain authoritative. */
(()=>{
'use strict';
const V2='parkCountdown.v2.preview', origin=location.origin;
const get=(key, fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const make=(tag,txt,cls)=>{let x=document.createElement(tag);if(txt)x.textContent=txt;if(cls)x.className=cls;return x};
const nav=document.querySelector('.tabs'), hero=document.querySelector('#hero'), ticker=document.querySelector('#tickerCard');
if(!nav||!hero||!ticker)return;
const style=make('style');style.textContent=`.tabs{flex-wrap:wrap}.v27-links{display:flex;flex-wrap:wrap;gap:8px}.v27-links button{white-space:normal}.v27-frame{width:100%;border:0;display:block;min-height:450px;background:transparent}.v27-frame-panel{padding:12px}.v27-gallery{display:flex;flex-direction:column;gap:10px}.v27-resort-visual{aspect-ratio:16/9;border-radius:14px;overflow:hidden;background:#141637;display:grid;place-items:center}.v27-resort-visual img{width:100%;height:100%;object-fit:cover;display:block;animation:v27fade .35s ease-out}.v27-resort-visual p{padding:16px}.v27-resort-caption a{color:var(--gold);overflow-wrap:anywhere}.v27-resort-caption small{font-size:.72rem}.v27-gallery .v27-links button{min-height:44px}.v27-resort-caption h2{margin:0 0 4px}@keyframes v27fade{from{opacity:.4}to{opacity:1}}@media(prefers-reduced-motion:reduce){.v27-resort-visual img{animation:none}}.v27-gallery h2{margin-bottom:6px}.v27-gallery[hidden]{display:none}.v27-frame-panel[hidden]{display:none}.v27-note{margin:8px 0}.v27-gallery .v27-links{margin-top:8px}`;document.head.append(style);
let extra=make('button','More');extra.dataset.tab='extras';nav.append(extra);
let panel=make('section','','card v27-frame-panel');panel.dataset.panel='extras';panel.hidden=true;let head=make('div','','row');head.style.justifyContent='space-between';head.append(make('h2','Vacation companion'),make('span','V2.7 integrated','muted'));panel.append(head);let frame=make('iframe','','v27-frame');frame.title='Resorts, planning, passport and memories';frame.allow='clipboard-write; web-share';panel.append(frame);let returnBtn=make('button','Back to original Home');returnBtn.onclick=()=>showTab('home');panel.append(returnBtn);document.querySelector('.wrap').append(panel);
let galleryCard=make('section','','card v27-gallery');galleryCard.hidden=true;hero.after(galleryCard);let homeCard=make('section','','card');ticker.after(homeCard);
let currentRoute='Explore', currentTrip='',currentDay='', photoIndex=0, ready=false;
const button=(label,cb,primary=false)=>{let b=make('button',label,primary?'primary':'');b.type='button';b.onclick=cb;return b};
function sendResearchArt(){if(!ready)return;const photos=resortPhotos.map(({resort,src,original,author,source,license,licenseURL,generic})=>({resort,src,original,author,source,license,licenseURL,generic}));const artwork=resortArt.map(({resort,src,name})=>({resort,src,name,art:true}));frame.contentWindow.postMessage({kind:'park-resort-art',photos,artwork},origin)}
function send(){if(ready){frame.contentWindow.postMessage({kind:'park-open',tab:currentRoute,tripId:currentTrip,day:currentDay},origin);sendResearchArt()}}
function open(route, opts={}){currentRoute=route;currentTrip=opts.tripId??nextTrip()?.id??'';currentDay=opts.day??'';showTab('extras');if(!frame.hasAttribute('src')){frame.src='companion.html?embedded=1&tab='+encodeURIComponent(route);ready=false}window.scrollTo({top:0,behavior:'auto'})}
extra.onclick=()=>open(currentRoute,{tripId:currentTrip||nextTrip()?.id});
const originalShow=showTab;showTab=function(t){originalShow(t);if(t==='home')refreshHome();if(t==='extras'&&frame.hasAttribute('src'))send()};
const originalHome=renderHome;renderHome=function(){originalHome();refreshHome()};
const originalSave=save;save=function(){originalSave();if(ready&&!panel.hidden)frame.contentWindow.postMessage({kind:'park-refresh'},origin)};
function routeLinks(items){let row=make('div','','v27-links');for(const [name,route] of items)row.append(button(name,()=>open(route),false));return row}
function addLink(anchor,title,desc,items){if(!anchor)return;let c=make('div','','v27-note');c.append(make('h2',title),make('p',desc,'muted'),routeLinks(items));anchor.append(c)}
addLink(document.querySelector('[data-panel="waits"]'),'Smart wait tools','Original favorites stay above. View live history, watch alerts, hours and showtimes.',[['Wait trends & alerts','Waits']]);
addLink(document.querySelector('[data-panel="pick"]'),'Attraction passport','Log completed rides without changing your favorite ride artwork.',[['Passport & achievements','Passport']]);
addLink(document.querySelector('[data-panel="trips"]'),'More trip tools','Keep using the original trip form and crowd calendar. Plan activities and choose your hotel in the companion.',[['Itinerary & budget','Trips'],['Resort hotels','Explore'],['Trip history','Memories'],['Gallery settings','Settings']]);
const importCard=make('section','','card');importCard.dataset.panel='trips';importCard.hidden=true;importCard.append(make('h2','Bring over preview trips'),make('p','If you created trips in the earlier V2 preview on this same site, import them into the original trip calendar. Your detailed plans and resort choices stay linked by trip ID.','muted'));importCard.append(button('Import earlier V2 trips',()=>{
 const v=get(V2,{}), candidates=[...(v.legacyTrips||[]),...(v.trips||[])], known=new Set(state.trips.map(x=>x.id)), added=[];const ids=new Set();
 for(const t of candidates){if(!t||!t.id||ids.has(t.id)||known.has(t.id)||!/^\d{4}-\d{2}-\d{2}$/.test(t.date||'')||(v.integratedIds||[]).includes(t.id))continue;ids.add(t.id);const dest=RESORTS.find(r=>r.id===t.destId)||RESORTS.find(r=>r.tz===t.tz)||RESORTS[0];added.push({id:t.id,name:String(t.name||'Park vacation'),date:t.date,endDate:t.endDate>=t.date?t.endDate:t.date,time:/^\d\d:\d\d$/.test(t.time||'')?t.time:'15:00',destId:dest.id,destName:dest.name,tz:dest.tz,days:t.days||{}})}
 if(!added.length){alert('No new preview trips to import.');return}if(!confirm('Import '+added.length+' trip(s)? Unknown destinations default to Walt Disney World; you can edit them afterward.'))return;state.trips.push(...added);save();renderTrips();renderHero();renderHome();alert('Imported '+added.length+' trip(s).');
},true));document.querySelector('.wrap').append(importCard);
// Resort photo catalog: freely licensed Wikimedia Commons photographs. Credits are displayed for each slide.
const resortPhotos = [
 {
  "resort": "Polynesian Village Resort",
  "src": "https://upload.wikimedia.org/wikipedia/commons/3/3e/Polynesian_Evening_%2827124765914%29.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/3/3e/Polynesian_Evening_%2827124765914%29.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:Polynesian_Evening_(27124765914).jpg",
  "author": "Chad Sparkes",
  "license": "CC BY 2.0",
  "licenseURL": "https://creativecommons.org/licenses/by/2.0/",
  "kind": "any"
 },
 {
  "resort": "Polynesian Village Resort",
  "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Polynesian_Village_Resort_at_Sunset.jpg/960px-Polynesian_Village_Resort_at_Sunset.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/8/8d/Polynesian_Village_Resort_at_Sunset.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:Polynesian_Village_Resort_at_Sunset.jpg",
  "author": "Lexi Scott (lxsscott)",
  "license": "CC BY 2.0",
  "licenseURL": "https://creativecommons.org/licenses/by/2.0/",
  "kind": "night"
 },
 {
  "resort": "Grand Floridian Resort & Spa",
  "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Disneygrandfloridian.jpg/960px-Disneygrandfloridian.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/9/90/Disneygrandfloridian.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:Disneygrandfloridian.jpg",
  "author": "Scdis32",
  "license": "CC BY 3.0",
  "licenseURL": "https://creativecommons.org/licenses/by/3.0/",
  "kind": "any"
 },
 {
  "resort": "Contemporary Resort",
  "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Disney%27s_Contemporary_Resort.jpg/960px-Disney%27s_Contemporary_Resort.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/0/0c/Disney%27s_Contemporary_Resort.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:Disney%27s_Contemporary_Resort.jpg",
  "author": "Benjamin D. Esham / Wikimedia Commons",
  "license": "CC BY-SA 4.0",
  "licenseURL": "https://creativecommons.org/licenses/by-sa/4.0/",
  "kind": "any"
 },
 {
  "resort": "Wilderness Lodge",
  "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Disney_World_-_Wilderness_Lodge_with_rocks.jpg/960px-Disney_World_-_Wilderness_Lodge_with_rocks.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/f/f3/Disney_World_-_Wilderness_Lodge_with_rocks.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:Disney_World_-_Wilderness_Lodge_with_rocks.jpg",
  "author": "LtPowers",
  "license": "CC BY-SA 4.0",
  "licenseURL": "https://creativecommons.org/licenses/by-sa/4.0/",
  "kind": "any"
 },
 {
  "resort": "Animal Kingdom Lodge",
  "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Animal_Kingdom_Lodge_%2843232872932%29.jpg/960px-Animal_Kingdom_Lodge_%2843232872932%29.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/b/b3/Animal_Kingdom_Lodge_%2843232872932%29.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:Animal_Kingdom_Lodge_%2843232872932%29.jpg",
  "author": "HarshLight",
  "license": "CC BY 2.0",
  "licenseURL": "https://creativecommons.org/licenses/by/2.0/",
  "kind": "any"
 },
 {
  "resort": "Beach Club Resort",
  "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/DisneyBeachClub1.jpg/960px-DisneyBeachClub1.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/1/13/DisneyBeachClub1.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:DisneyBeachClub1.jpg",
  "author": "Tammy Green",
  "license": "CC BY-SA 2.0",
  "licenseURL": "https://creativecommons.org/licenses/by-sa/2.0/",
  "kind": "any"
 },
 {
  "resort": "Yacht Club Resort",
  "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Disney%27s_Yacht_Club_Resort.jpg/960px-Disney%27s_Yacht_Club_Resort.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/c/c8/Disney%27s_Yacht_Club_Resort.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:Disney%27s_Yacht_Club_Resort.jpg",
  "author": "Silent Wind of Doom at English Wikipedia",
  "license": "CC BY-SA 3.0",
  "licenseURL": "https://creativecommons.org/licenses/by-sa/3.0/",
  "kind": "any"
 },
 {
  "resort": "BoardWalk Inn",
  "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Disney%27s_Boardwalk_Resort_%2826619350834%29.jpg/960px-Disney%27s_Boardwalk_Resort_%2826619350834%29.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/4/40/Disney%27s_Boardwalk_Resort_%2826619350834%29.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:Disney%27s_Boardwalk_Resort_%2826619350834%29.jpg",
  "author": "Chad Sparkes",
  "license": "CC BY 2.0",
  "licenseURL": "https://creativecommons.org/licenses/by/2.0/",
  "kind": "any"
 },
 {
  "resort": "Riviera Resort",
  "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Riviera_at_Night_%2849560224208%29.jpg/960px-Riviera_at_Night_%2849560224208%29.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/c/cc/Riviera_at_Night_%2849560224208%29.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:Riviera_at_Night_%2849560224208%29.jpg",
  "author": "Eden, Janine and Jim",
  "license": "CC BY 2.0",
  "licenseURL": "https://creativecommons.org/licenses/by/2.0/",
  "kind": "night"
 },
 {
  "resort": "Saratoga Springs Resort & Spa",
  "src": "https://upload.wikimedia.org/wikipedia/commons/f/f3/Congress_Park%2C_Disney%27s_Saratoga_Springs_Resort_and_Spa.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/f/f3/Congress_Park%2C_Disney%27s_Saratoga_Springs_Resort_and_Spa.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:Congress_Park%2C_Disney%27s_Saratoga_Springs_Resort_and_Spa.jpg",
  "author": "Lucky bunni at English Wikipedia",
  "license": "CC BY-SA 3.0",
  "licenseURL": "https://creativecommons.org/licenses/by-sa/3.0/",
  "kind": "any"
 },
 {
  "resort": "Old Key West Resort",
  "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Old_key_west_panoramic.jpg/960px-Old_key_west_panoramic.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/b/b3/Old_key_west_panoramic.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:Old_key_west_panoramic.jpg",
  "author": "MoodyGroove at English Wikipedia",
  "license": "CC BY-SA 3.0",
  "licenseURL": "https://creativecommons.org/licenses/by-sa/3.0/",
  "kind": "any"
 },
 {
  "resort": "Fort Wilderness Resort & Campground",
  "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Fort_Wilderness_cabin.jpg/960px-Fort_Wilderness_cabin.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/b/ba/Fort_Wilderness_cabin.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:Fort_Wilderness_cabin.jpg",
  "author": "Benjamin D. Esham / Wikimedia Commons",
  "license": "CC BY-SA 4.0",
  "licenseURL": "https://creativecommons.org/licenses/by-sa/4.0/",
  "kind": "any"
 },
 {
  "resort": "Port Orleans Riverside",
  "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Orlando_-_Disney_World_-_Disney%27s_Port_Orleans_Resort_-_Riverside_-_Looking_Down_the_River_%2817217633862%29.jpg/960px-Orlando_-_Disney_World_-_Disney%27s_Port_Orleans_Resort_-_Riverside_-_Looking_Down_the_River_%2817217633862%29.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/4/41/Orlando_-_Disney_World_-_Disney%27s_Port_Orleans_Resort_-_Riverside_-_Looking_Down_the_River_%2817217633862%29.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:Orlando_-_Disney_World_-_Disney%27s_Port_Orleans_Resort_-_Riverside_-_Looking_Down_the_River_%2817217633862%29.jpg",
  "author": "Jared",
  "license": "CC BY 2.0",
  "licenseURL": "https://creativecommons.org/licenses/by/2.0/",
  "kind": "any"
 },
 {
  "resort": "Port Orleans French Quarter",
  "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Orlando_-_Disney_World_-_Disney%27s_Port_Orleans_Resort_-_French_Quarter_-_Courtyard_View_Towards_Lobby_%2816596864474%29.jpg/960px-Orlando_-_Disney_World_-_Disney%27s_Port_Orleans_Resort_-_French_Quarter_-_Courtyard_View_Towards_Lobby_%2816596864474%29.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/f/f9/Orlando_-_Disney_World_-_Disney%27s_Port_Orleans_Resort_-_French_Quarter_-_Courtyard_View_Towards_Lobby_%2816596864474%29.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:Orlando_-_Disney_World_-_Disney%27s_Port_Orleans_Resort_-_French_Quarter_-_Courtyard_View_Towards_Lobby_%2816596864474%29.jpg",
  "author": "Jared",
  "license": "CC BY 2.0",
  "licenseURL": "https://creativecommons.org/licenses/by/2.0/",
  "kind": "any"
 },
 {
  "resort": "Caribbean Beach Resort",
  "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Disney%27s_Caribbean_Beach_Resort.JPG/960px-Disney%27s_Caribbean_Beach_Resort.JPG",
  "original": "https://upload.wikimedia.org/wikipedia/commons/c/c7/Disney%27s_Caribbean_Beach_Resort.JPG",
  "source": "https://commons.wikimedia.org/wiki/File:Disney%27s_Caribbean_Beach_Resort.JPG",
  "author": "Matt H. Wade (UpstateNYer)",
  "license": "CC BY-SA 3.0",
  "licenseURL": "https://creativecommons.org/licenses/by-sa/3.0/",
  "kind": "any"
 },
 {
  "resort": "Coronado Springs Resort",
  "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Coronado_Springs_Resort.jpg/960px-Coronado_Springs_Resort.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/9/9a/Coronado_Springs_Resort.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:Coronado_Springs_Resort.jpg",
  "author": "Michelle Tribe",
  "license": "CC BY 2.0",
  "licenseURL": "https://creativecommons.org/licenses/by/2.0/",
  "kind": "any"
 },
 {
  "resort": "Pop Century Resort",
  "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Orlando_-_Disney_World_-_Disney%27s_Pop_Century_Resort_-_Hippy_Dippy_Pool_%2816599103293%29.jpg/960px-Orlando_-_Disney_World_-_Disney%27s_Pop_Century_Resort_-_Hippy_Dippy_Pool_%2816599103293%29.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/b/b5/Orlando_-_Disney_World_-_Disney%27s_Pop_Century_Resort_-_Hippy_Dippy_Pool_%2816599103293%29.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:Orlando_-_Disney_World_-_Disney%27s_Pop_Century_Resort_-_Hippy_Dippy_Pool_%2816599103293%29.jpg",
  "author": "Jared",
  "license": "CC BY 2.0",
  "licenseURL": "https://creativecommons.org/licenses/by/2.0/",
  "kind": "any"
 },
 {
  "resort": "Art of Animation Resort",
  "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Disney%27s_Art_of_Animation_Resort_%286989431010%29.jpg/960px-Disney%27s_Art_of_Animation_Resort_%286989431010%29.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/a/a2/Disney%27s_Art_of_Animation_Resort_%286989431010%29.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:Disney%27s_Art_of_Animation_Resort_%286989431010%29.jpg",
  "author": "zannaland (photo by Suzannah DiMarzio)",
  "license": "CC BY-SA 2.0",
  "licenseURL": "https://creativecommons.org/licenses/by-sa/2.0/",
  "kind": "any"
 },
 {
  "resort": "All-Star Movies Resort",
  "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Disney%27s_All-Star_Movie_Resort_and_sign.jpg/960px-Disney%27s_All-Star_Movie_Resort_and_sign.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/3/3c/Disney%27s_All-Star_Movie_Resort_and_sign.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:Disney%27s_All-Star_Movie_Resort_and_sign.jpg",
  "author": "Michael Rivera",
  "license": "CC BY-SA 4.0",
  "licenseURL": "https://creativecommons.org/licenses/by-sa/4.0/",
  "kind": "any"
 },
 {
  "resort": "All-Star Music Resort",
  "src": "https://upload.wikimedia.org/wikipedia/commons/7/76/Disney_Music_All_Star_Hotel_Exterior.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/7/76/Disney_Music_All_Star_Hotel_Exterior.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:Disney_Music_All_Star_Hotel_Exterior.jpg",
  "author": "TMBLover",
  "license": "CC BY-SA 4.0",
  "licenseURL": "https://creativecommons.org/licenses/by-sa/4.0/",
  "kind": "any"
 },
 {
  "resort": "All-Star Sports Resort",
  "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Disney%27s_All-Star_Sports_Resort_02.jpg/960px-Disney%27s_All-Star_Sports_Resort_02.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/3/3f/Disney%27s_All-Star_Sports_Resort_02.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:Disney%27s_All-Star_Sports_Resort_02.jpg",
  "author": "Michael Rivera",
  "license": "CC BY-SA 4.0",
  "licenseURL": "https://creativecommons.org/licenses/by-sa/4.0/",
  "kind": "any"
 },
 {
  "resort": "Off-site / other",
  "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Universal_Aventura_Hotel_06.jpg/960px-Universal_Aventura_Hotel_06.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/4/4e/Universal_Aventura_Hotel_06.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:Universal_Aventura_Hotel_06.jpg",
  "author": "Farragutful",
  "license": "CC BY-SA 4.0",
  "licenseURL": "https://creativecommons.org/licenses/by-sa/4.0/",
  "kind": "any",
  "generic": true
 }
];
const galleryKey='parkCountdown.v2.homeGallery';
let homeGallery=Object.assign({mode:'all',paused:false},get(galleryKey,{})),lastSlideKey='',lastSelection='',failedPhotos=new Set();
function storeHomeGallery(){try{localStorage.setItem(galleryKey,JSON.stringify(homeGallery))}catch(e){}}
// Resort artwork packs: a separate IndexedDB database, independent of ride pictures.
const packDBName='parkCountdownResortArt', packStore='art';
let resortArt=[], artDBPromise, packBusy=false;
const resortSlug=x=>String(x).toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function openArtDB(){return artDBPromise ||= new Promise((resolve,reject)=>{const r=indexedDB.open(packDBName,1);r.onupgradeneeded=()=>r.result.createObjectStore(packStore,{keyPath:'key'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function artTransaction(mode,fn){const db=await openArtDB();return new Promise((resolve,reject)=>{const tx=db.transaction(packStore,mode);let request=fn(tx.objectStore(packStore));tx.oncomplete=()=>resolve(request?.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Image storage transaction aborted'));});}
async function loadResortArt(){const rows=await artTransaction('readonly',s=>s.getAll());for(const p of resortArt)URL.revokeObjectURL(p.src);resortArt=rows.map(p=>({...p,src:URL.createObjectURL(p.blob),art:true})).sort((a,b)=>a.resort.localeCompare(b.resort)||a.key.localeCompare(b.key));photoIndex=0;lastSlideKey='';failedPhotos.clear();updateArtStatus();refreshHome();sendResearchArt();}
const MAX_PACK=32*1024*1024, MAX_IMAGE=3*1024*1024;
async function readResortZip(buffer){
 const bytes=new Uint8Array(buffer),d=new DataView(buffer);if(bytes.length>MAX_PACK||bytes.length<22)throw Error('ZIP must be under 32 MB.');
 let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(d.getUint32(i,true)===0x06054b50&&i+22+d.getUint16(i+20,true)===bytes.length){end=i;break}if(end<0)throw Error('Invalid ZIP directory');
 if(d.getUint16(end+4,true)||d.getUint16(end+6,true))throw Error('Split ZIPs are unsupported');const count=d.getUint16(end+10,true),start=d.getUint32(end+16,true),size=d.getUint32(end+12,true);if(count>300||start+size>end)throw Error('ZIP directory too large or invalid');
 let off=start,total=0;const result=new Map(),decoder=new TextDecoder();
 for(let i=0;i<count;i++){
  if(off+46>start+size||d.getUint32(off,true)!==0x02014b50)throw Error('Invalid ZIP entry');const flags=d.getUint16(off+8,true),method=d.getUint16(off+10,true),compressed=d.getUint32(off+20,true),length=d.getUint32(off+24,true),nl=d.getUint16(off+28,true),xl=d.getUint16(off+30,true),cl=d.getUint16(off+32,true),local=d.getUint32(off+42,true);if(off+46+nl+xl+cl>start+size)throw Error('Truncated ZIP entry');const full=decoder.decode(bytes.subarray(off+46,off+46+nl)).replace(/\\/g,'/');off+=46+nl+xl+cl;const name=full.split('/').pop();if(!name||full.includes('__MACOSX/')||name.startsWith('.')||!/(?:\.(?:webp|png|jpe?g)|^manifest\.json)$/i.test(name))continue;
  if(flags&1||![0,8].includes(method)||length>MAX_IMAGE||compressed>MAX_IMAGE||local+30>start||d.getUint32(local,true)!==0x04034b50)throw Error('Unsupported or oversized ZIP entry: '+name);total+=length;if(total>MAX_PACK)throw Error('Uncompressed pack too large');const pos=local+30+d.getUint16(local+26,true)+d.getUint16(local+28,true);if(pos+compressed>start||result.has(name.toLowerCase()))throw Error('Invalid or duplicate file: '+name);
  const raw=bytes.subarray(pos,pos+compressed);let data;if(method===0)data=raw;else{if(typeof DecompressionStream==='undefined')throw Error('This browser cannot open compressed ZIPs. Use a stored ZIP.');const reader=new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();let chunks=[],n=0;try{while(true){const {value,done}=await reader.read();if(done)break;n+=value.length;if(n>length||n>MAX_IMAGE)throw Error('ZIP entry exceeds expected size');chunks.push(value)}}finally{await reader.cancel().catch(()=>{})}data=new Uint8Array(n);let p=0;for(const chunk of chunks){data.set(chunk,p);p+=chunk.length}}
  if(data.length!==length)throw Error('ZIP entry size mismatch: '+name);result.set(name.toLowerCase(),{name,data});
 }return result;
}
function imageMime(data){if(data.length>=12&&String.fromCharCode(...data.subarray(0,4))==='RIFF'&&String.fromCharCode(...data.subarray(8,12))==='WEBP')return'image/webp';if(data.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>data[i]===v))return'image/png';if(data.length>=3&&data[0]===255&&data[1]===216&&data[2]===255)return'image/jpeg';throw Error('Invalid image data');}
function matchPackEntries(files,known){const manifest=files.get('manifest.json');let map=new Map();if(manifest){const m=JSON.parse(new TextDecoder().decode(manifest.data));if(!Array.isArray(m))throw Error('Manifest must be an array of resort_name and file entries');for(const row of m){if(typeof row?.file!=='string'||!known.includes(row.resort_name))throw Error('Unknown resort or missing filename in manifest');const file=row.file.split('/').pop().toLowerCase();if(map.has(file)||!files.has(file))throw Error('Duplicate or missing manifest image: '+file);map.set(file,row);}}
 const ordered=known.slice().sort((a,b)=>resortSlug(b).length-resortSlug(a).length),out=[];let skipped=0;for(const [file,v] of files){if(file==='manifest.json')continue;const row=map.get(file),stem=resortSlug(file.replace(/\.[^.]+$/,'')),resort=row?.resort_name||ordered.find(n=>stem===resortSlug(n)||stem.startsWith(resortSlug(n)+'-'));if(!resort){skipped++;continue;}const kind=['any','day','night'].includes(row?.kind)?row.kind:'any';out.push({key:resort+'|'+file,resort,kind,name:String(row?.name||v.name).slice(0,150),blob:new Blob([v.data],{type:imageMime(v.data)})});}return {out,skipped};}
const artCard=make('section','','card');artCard.dataset.panel='pictures';artCard.hidden=true;artCard.id='resortPackCard';artCard.append(make('h2','Resort picture packs'),make('p','Upload resort ZIPs just like attraction picture packs. Artwork stays on this device and automatically replaces online resort photographs in the Home carousel when available.','muted'));
const artInput=make('input');artInput.type='file';artInput.accept='.zip,application/zip,image/webp,image/png,image/jpeg';artInput.multiple=true;artInput.hidden=true;const artStatus=make('p','','muted');artStatus.setAttribute('role','status');const artCounts=make('div','','muted');const artButtons=make('div','','row');
const artUpload=button('Upload resort pictures',()=>artInput.click(),true),artClear=button('Remove resort pack pictures',async()=>{if(packBusy||!resortArt.length||!confirm('Remove all imported resort artwork? Attraction picture packs and personal resort photos are not affected.'))return;packBusy=true;artUpload.disabled=true;artClear.disabled=true;try{await artTransaction('readwrite',s=>s.clear());await loadResortArt();artStatus.textContent='Resort artwork removed.'}catch(err){artStatus.textContent=err.message}finally{packBusy=false;artUpload.disabled=false;artClear.disabled=!resortArt.length;}});
artButtons.append(artUpload,artClear);artCard.append(artButtons,artStatus,artCounts,artInput);document.querySelector('.wrap').append(artCard);
function updateArtStatus(){const counts=new Map();for(const p of resortArt)counts.set(p.resort,(counts.get(p.resort)||0)+1);artCounts.replaceChildren(make('p',`${resortArt.length} images · ${counts.size} resorts`));for(const [name,count] of counts)artCounts.append(make('div',`${name} · ${count} images`));artClear.disabled=packBusy||!resortArt.length;}
artInput.onchange=async()=>{if(packBusy)return;const chosen=Array.from(artInput.files||[]);artInput.value='';if(!chosen.length)return;packBusy=true;artUpload.disabled=true;artClear.disabled=true;artStatus.textContent='Reading resort artwork…';try{let all=[],skipped=0;const known=[...new Set(resortPhotos.map(x=>x.resort))];for(const file of chosen){if(file.size>MAX_PACK)throw Error('Pack exceeds 32 MB');if(/\.zip$/i.test(file.name)){let r=matchPackEntries(await readResortZip(await file.arrayBuffer()),known);all.push(...r.out);skipped+=r.skipped;}else{if(file.size>MAX_IMAGE)throw Error('Image exceeds 3 MB');const data=new Uint8Array(await file.arrayBuffer()),r=matchPackEntries(new Map([[file.name.toLowerCase(),{name:file.name,data}]]),known);all.push(...r.out);skipped+=r.skipped;}}if(!all.length)throw Error('No matching resort pictures. Include manifest.json or use resort-name-scene.webp filenames.');const unique=[...new Map(all.map(x=>[x.key,x])).values()];await artTransaction('readwrite',s=>{for(const p of unique)s.put(p)});await loadResortArt();artStatus.textContent=`Imported or updated ${unique.length} pictures${skipped?`; skipped ${skipped} unmatched`:''}.`;}catch(err){artStatus.textContent='Import failed: '+err.message;}finally{packBusy=false;artUpload.disabled=false;artClear.disabled=!resortArt.length;}};
// Dedicated image library: move the original attraction card without recreating its inputs or listeners.
const picturesTab=make('button','Pictures');picturesTab.type='button';picturesTab.dataset.tab='pictures';nav.insertBefore(picturesTab,extra);
const ridePackCard=document.querySelector('#packInput')?.closest('section[data-panel]');
if(ridePackCard){
 ridePackCard.dataset.panel='pictures';ridePackCard.hidden=true;
 const heading=ridePackCard.querySelector('h2');if(heading)heading.textContent='Attraction picture packs';
 const upload=ridePackCard.querySelector('#packBtn');if(upload)upload.textContent='Upload attraction pictures';
 const status=ridePackCard.querySelector('#packStatus');if(status)status.setAttribute('aria-live','polite');
}
const picturesIntro=make('section','','card');picturesIntro.dataset.panel='pictures';picturesIntro.hidden=true;
picturesIntro.append(make('h2','Picture library'),make('p','Upload and manage attraction and resort artwork in one place. Import ZIP packs without extracting them, or select individual images. Saved pictures remain on this device.','muted'));
const picturesWrap=document.querySelector('.wrap');picturesWrap.insertBefore(picturesIntro,artCard);
if(ridePackCard)picturesWrap.insertBefore(ridePackCard,artCard);
function openPictures(){showTab('pictures');window.scrollTo({top:0,behavior:'auto'});}
picturesTab.onclick=openPictures;
function openResortPacks(){openPictures();}

// ---- One upload for everything: images or ZIPs; each picture is routed to resorts or attractions by its name or manifest ----
const EXTRA_RESORTS=["Disney's Polynesian Village Resort","Polynesian Village Resort","Grand Floridian Resort & Spa","Disney's Grand Floridian Resort & Spa","Contemporary Resort","Wilderness Lodge","Disney's Wilderness Lodge","Beach Club Resort","Yacht Club Resort","BoardWalk Inn","Riviera Resort","Animal Kingdom Lodge","Coronado Springs Resort","Caribbean Beach Resort","Port Orleans Riverside","Port Orleans French Quarter","Pop Century Resort","Art of Animation Resort","All-Star Movies Resort","All-Star Music Resort","All-Star Sports Resort","Old Key West Resort","Saratoga Springs Resort","Fort Wilderness Resort","Swan Reserve","Walt Disney World Swan","Walt Disney World Dolphin","Disneyland Hotel","Grand Californian Hotel","Pixar Place Hotel","Shades of Green","Four Seasons Orlando"];
const allResortNames=()=>[...new Set([...resortPhotos.map(x=>x.resort),...EXTRA_RESORTS])].filter(n=>n&&n!=='Off-site / other');
// "polynesian-village-resort-night.webp" -> Polynesian Village Resort (prefix match on the longest name; "disney's" optional)
function resortForFile(name){const stem=resortSlug(name.replace(/\.[^.]+$/,'')).replace(/^disney-s-|^disneys-/,'');let best='';for(const n of allResortNames()){const slug=resortSlug(n).replace(/^disney-s-|^disneys-/,'');if((stem===slug||stem.startsWith(slug+'-'))&&slug.length>resortSlug(best).length)best=n}
 if(!best)return '';const catalog=resortPhotos.find(p=>resortSlug(p.resort).replace(/^disney-s-|^disneys-/,'')===resortSlug(best).replace(/^disney-s-|^disneys-/,''));return catalog?catalog.resort:best}
const sceneKind=n=>/night|evening|lantern|firework|dusk/i.test(n)?'night':/\bday|morning|sunny|daytime/i.test(n)?'day':'any';
async function shrinkImage(blob,max=1600){
 let bmp;try{bmp=await createImageBitmap(blob)}catch(e){const url=URL.createObjectURL(blob);try{bmp=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(Error('unreadable image'));i.src=url})}finally{setTimeout(()=>URL.revokeObjectURL(url),1000)}}
 const w=bmp.width||bmp.naturalWidth,h=bmp.height||bmp.naturalHeight,k=Math.min(1,max/Math.max(w,h));
 if(k===1&&blob.size<=1.5*1024*1024&&/image\/(jpeg|webp|png)/.test(blob.type))return blob;
 const c=document.createElement('canvas');c.width=Math.round(w*k);c.height=Math.round(h*k);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
 return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(Error('could not compress image')),'image/jpeg',0.85));
}
async function keepPicturesSafe(){try{if(navigator.storage?.persist&&!(await navigator.storage.persisted()))await navigator.storage.persist()}catch(e){}}
async function savedAttractionCount(){try{const db=await new Promise((res,rej)=>{const r=indexedDB.open('parkCountdown',1);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});return await new Promise(res=>{let n=0;const c=db.transaction('photos').objectStore('photos').openKeyCursor();c.onsuccess=()=>{const k=c.result;if(k){if(String(k.key).startsWith('pack:'))n++;k.continue()}else res(n)};c.onerror=()=>res(-1)})}catch(e){return -1}}
async function importPictures(files){
 const status=pictureStatus;status.textContent='Reading pictures…';
 let entries=[];
 for(const f of files){
  if(/\.zip$/i.test(f.name)||/zip/.test(f.type)){try{entries=entries.concat(await readZip(f))}catch(e){status.textContent=`Couldn't open ${f.name}: ${e.message}`;return}}
  else entries.push({name:f.name,blob:f});
 }
 const rideRows=[],resortRows=new Map();
 for(const m of entries.filter(e=>e.name.toLowerCase()==='manifest.json')){try{const rows=JSON.parse(await m.blob.text());for(const r of Array.isArray(rows)?rows:[]){const file=String(r?.file||'').split('/').pop();if(!file)continue;if(r.resort_name)resortRows.set(file.toLowerCase(),r);else if(r.ride_name)rideRows.push({file,ride_name:r.ride_name})}}catch(e){}}
 const images=entries.filter(e=>e.name.toLowerCase()!=='manifest.json'&&/\.(jpe?g|png|webp|gif|avif|heic)$/i.test(e.name));
 const rideFiles=new Set(rideRows.map(r=>r.file.toLowerCase()));
 const toResort=[],toRide=[];
 for(const e of images){const lower=e.name.toLowerCase();const row=resortRows.get(lower);
  if(!rideFiles.has(lower)&&(row||resortForFile(e.name)))toResort.push({e,resort:row?.resort_name||resortForFile(e.name),kind:['any','day','night'].includes(row?.kind)?row.kind:sceneKind(e.name),name:String(row?.name||e.name).slice(0,150)});
  else toRide.push(e);}
 await keepPicturesSafe();
 let resortsSaved=0,failed=0;
 for(let i=0;i<toResort.length;i++){const r=toResort[i];status.textContent=`Saving resort pictures… ${i+1} of ${toResort.length}`;
  try{const blob=await shrinkImage(r.e.blob);await artTransaction('readwrite',s=>s.put({key:r.resort+'|'+r.e.name.toLowerCase(),resort:r.resort,kind:r.kind,name:r.name,blob}));resortsSaved++}catch(err){failed++}}
 if(resortsSaved)await loadResortArt();
 let ridesAdded=0;
 if(toRide.length){const before=packArt.size;const list=toRide.map(e=>new File([e.blob],e.name,{type:e.blob.type||'image/jpeg'}));
  if(rideRows.length)list.push(new File([JSON.stringify(rideRows)],'manifest.json',{type:'application/json'}));
  status.textContent=`Saving attraction pictures… (${toRide.length})`;
  try{await addPack(list)}catch(err){failed+=toRide.length}
  ridesAdded=Math.max(0,packArt.size-before)||toRide.length;}
 const saved=await savedAttractionCount();
 const parts=[];if(ridesAdded)parts.push(`${ridesAdded} attraction`);if(resortsSaved)parts.push(`${resortsSaved} resort`);
 let msg=parts.length?`Added ${parts.join(' and ')} picture${ridesAdded+resortsSaved===1?'':'s'}.`:'No pictures were added.';
 if(failed)msg+=` ${failed} couldn't be read and were skipped.`;
 if(saved>=0&&saved<packArt.size)msg+=` Warning: this browser only kept ${saved} of ${packArt.size} attraction pictures. Storage may be full.`;
 status.textContent=msg;updatePictureCounts();
}
const pictureInput=make('input');pictureInput.type='file';pictureInput.multiple=true;pictureInput.hidden=true;pictureInput.accept='image/*,.zip,application/zip';
const pictureStatus=make('p','','muted');pictureStatus.setAttribute('role','status');pictureStatus.setAttribute('aria-live','polite');
const pictureCounts=make('p','','muted');
function updatePictureCounts(){pictureCounts.textContent=`Saved on this device: ${packArt.size} attraction picture${packArt.size===1?'':'s'} · ${resortArt.length} resort picture${resortArt.length===1?'':'s'}.`}
let pictureBusy=false;
const pictureUpload=button('Upload pictures',()=>pictureInput.click(),true);
pictureInput.onchange=async()=>{const files=[...(pictureInput.files||[])];pictureInput.value='';if(!files.length||pictureBusy)return;pictureBusy=true;pictureUpload.disabled=true;try{await importPictures(files)}catch(e){pictureStatus.textContent='Import failed: '+(e?.message||e)}finally{pictureBusy=false;pictureUpload.disabled=false}};
picturesIntro.replaceChildren(make('h2','Picture library'),
 make('p','Pick images or ZIP packs, for resorts and attractions together. Pictures named after a hotel (like polynesian-village-resort-night.webp) or listed with resort_name in manifest.json go to the resort gallery; everything else is matched to rides by file name, as before. Large images are shrunk to fit.','muted'));
const pictureRow=make('div','','row');pictureRow.append(pictureUpload);picturesIntro.append(pictureRow,pictureStatus,pictureCounts,pictureInput);
// the old per-type upload buttons are replaced by the one above; their remove buttons and counts stay
{const old=ridePackCard?.querySelector('#packBtn');if(old)old.hidden=true;artUpload.hidden=true;
 const tidy=(card,title,text)=>{if(!card)return;const h=card.querySelector('h2');if(h)h.textContent=title;const d=[...card.querySelectorAll('p')].find(x=>!x.getAttribute('role')&&!x.id&&x.classList.contains('muted'));if(d)d.textContent=text;const help=card.querySelector('details');if(help&&!card.querySelector('#healthHelp'))help.hidden=true;};
 tidy(ridePackCard,'Attraction pictures','Saved ride pictures. Your own single-ride photos (set on Parks & Rides) still win over these.');
 tidy(artCard,'Resort pictures','Saved resort artwork. It replaces the online resort photos in the Home gallery.');}
picturesTab.addEventListener('click',updatePictureCounts);
setTimeout(updatePictureCounts,1500);


const safePersonalPhoto=x=>typeof x==='string'&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(x);
function selectResortPhotos(v,selected,mode,period){
 const personal=[];
 const names=new Set([...Object.keys(v.gallery||{}),...Object.keys(v.images||{})]);
 for(const resort of names){let list=Array.isArray(v.gallery?.[resort])?v.gallery[resort].filter(p=>safePersonalPhoto(p?.src)):[];if(!list.length&&safePersonalPhoto(v.images?.[resort]))list=[{src:v.images[resort],kind:'any'}];
  for(const p of list)personal.push({resort,src:p.src,kind:p.kind||'any',personal:true});}
 const all=[...personal,...resortArt,...resortPhotos];
 const custom=[...personal,...resortArt];
 let chosen=mode==='selected'&&selected?(custom.some(p=>p.resort===selected)?custom.filter(p=>p.resort===selected):all.filter(p=>p.resort===selected)):(custom.length?custom:all);
 if(mode==='selected'&&selected){let preferred=chosen.filter(p=>p.kind===period||p.kind==='any');if(preferred.length>=2)chosen=preferred;}
 if(!chosen.length&&mode==='selected'&&selected&&!resortPhotos.some(p=>p.resort===selected)){chosen=resortPhotos.filter(p=>p.generic&&p.resort==='Off-site / other').map(p=>({...p,resort:selected}));}
 if(!chosen.length&&!(mode==='selected'&&selected))chosen=all;
 const seen=new Set();return chosen.filter(p=>!seen.has(p.src)&&seen.add(p.src));
}
function renderResortGallery(t,v,d,summaryDay){
 galleryCard.hidden=!!summaryDay; if(galleryCard.hidden)return;
 const selected=d?.resort||'';let period=v.galleryPrefs?.theme;if(!period||period==='auto'){let hr;try{hr=Number(new Intl.DateTimeFormat('en-US',{timeZone:t?.tz||'America/New_York',hour:'numeric',hourCycle:'h23'}).format(new Date()))}catch{hr=new Date().getHours()}period=hr>=6&&hr<18?'day':'night'}
 const selection=[t?.id,selected,homeGallery.mode,period].join('|');if(selection!==lastSelection){photoIndex=0;lastSelection=selection;failedPhotos.clear()}
 const catalog=selectResortPhotos(v,selected,homeGallery.mode,period), pics=catalog.filter(p=>!failedPhotos.has(p.src));
 const pos=pics.length?((photoIndex%pics.length)+pics.length)%pics.length:0, slide=pics[pos];
 const label=homeGallery.mode==='selected'&&selected&&slide?.resort===selected?'YOUR RESORT':'EXPLORE THE RESORTS';
 const signature=[selection,slide?.src,pos,pics.length,homeGallery.paused,v.galleryPrefs?.rotation].join('|');
 if(signature===lastSlideKey)return;lastSlideKey=signature;galleryCard.replaceChildren();
 const top=make('div','','row');top.style.justifyContent='space-between';top.append(make('span',label,'muted'),make('span',pics.length?`${pos+1} / ${pics.length}`:'','muted'));galleryCard.append(top);
 const visual=make('div','','v27-resort-visual');galleryCard.append(visual);
 if(slide){const img=make('img');img.alt=slide.resort;img.decoding='async';img.referrerPolicy='no-referrer';if(!slide.art&&!slide.personal)img.style.objectFit='contain';let retried=false;img.onerror=()=>{if(!img.isConnected)return;if(!retried&&slide.original&&slide.original!==slide.src){retried=true;img.src=slide.original;return}failedPhotos.add(slide.src);lastSlideKey='';renderResortGallery(t,v,d,summaryDay)};img.src=slide.src;visual.append(img);}
 else visual.append(make('p','Resort pictures could not load. Check your connection or upload personal photos in Resort settings.','muted'));
 const caption=make('div','','v27-resort-caption');caption.append(make('h2',slide?.resort||(homeGallery.mode==='selected'&&selected?selected:'Resort gallery')));galleryCard.append(caption);
 if(slide?.art)caption.append(make('small',slide.name+' · Resort artwork pack','muted'));
 else if(slide?.personal)caption.append(make('small','Your personal photo','muted'));
 else if(slide){const credit=make('small','','muted');credit.append(document.createTextNode(slide.generic?'Representative Florida hotel photo (not your actual hotel): ':'Photo: '));const source=make('a',slide.author);source.href=slide.source;source.target='_blank';source.rel='noopener noreferrer';const lic=make('a',slide.license);lic.href=slide.licenseURL;lic.target='_blank';lic.rel='noopener noreferrer';credit.append(source,document.createTextNode(' · '),lic,document.createTextNode(' · Full photo'));caption.append(credit)}
 const row=make('div','','v27-links');const rerender=()=>{lastSlideKey='';renderResortGallery(t,v,d,summaryDay)};
 const prev=button('‹',()=>{photoIndex--;rerender()});prev.setAttribute('aria-label','Previous resort photo');prev.disabled=pics.length<2;
 const next=button('›',()=>{photoIndex++;rerender()});next.setAttribute('aria-label','Next resort photo');next.disabled=pics.length<2;
 const pause=button(homeGallery.paused||v.galleryPrefs?.rotation===false?'Play':'Pause',()=>{homeGallery.paused=!homeGallery.paused;if(v.galleryPrefs?.rotation===false){homeGallery.paused=false;alert('Automatic rotation is disabled in Resort gallery settings. Enable it there to resume.');}storeHomeGallery();rerender()});
 const modeBtn=button(homeGallery.mode==='selected'?'All resorts':'My resort',()=>{if(!selected&&homeGallery.mode==='all'){open('Explore',{tripId:t?.id});return}homeGallery.mode=homeGallery.mode==='selected'?'all':'selected';photoIndex=0;storeHomeGallery();rerender()});
 row.append(prev,next,pause,modeBtn,button('Resort details',()=>open('Explore',{tripId:t?.id})),button('Picture packs',openResortPacks));galleryCard.append(row);
 if(homeGallery.mode==='selected'&&selected&&slide?.resort!==selected)galleryCard.append(make('small','No photos for your selected hotel are available. Select All resorts to explore other hotels.','muted'));
}
function refreshHome(){
 const t=nextTrip(), v=get(V2,{}), d=t?v.data?.[t.id]:null;let summaryDay=typeof homeDay!=='undefined'&&homeDay;
 renderResortGallery(t,v,d,summaryDay);
 homeCard.replaceChildren();homeCard.append(make('h2',summaryDay?'Detailed day planner':'Vacation companion'));if(t){const now=todayIn(t.tz), mode=d?.mode&&d.mode!=='auto'?d.mode:now<t.date?'Countdown':now===t.date?'Travel':now<=(t.endDate||t.date)?'Vacation':'Memories';const checks=d?.checks||[],due=(d?.milestones||[]).filter(x=>!x.done&&x.date<=now),plans=(d?.plans||[]).filter(x=>!x.done&&x.date>=now).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));homeCard.append(make('p',`${mode} mode · ${checks.filter(x=>x.done).length}/${checks.length} preparation items · ${due.length} reminders due`,'muted'));if(plans[0])homeCard.append(make('p','Up next: '+plans[0].name+' · '+plans[0].date+' '+plans[0].time));if(due[0])homeCard.append(make('p','Reminder: '+due[0].name));}else homeCard.append(make('p','Create a trip in the original Trips tab or view previous memories.','muted'));let row=make('div','','v27-links');row.append(button(summaryDay?'Plan this day':'Detailed itinerary',()=>open('Trips',{day:summaryDay||''}),true),button('Resorts',()=>open('Explore')),button('Passport',()=>open('Passport')),button('Memories',()=>open('Memories')));homeCard.append(row);
}
window.addEventListener('message',ev=>{if(ev.origin!==origin||ev.source!==frame.contentWindow)return;const m=ev.data||{};if(m.kind==='park-ready'){ready=true;send()}else if(m.kind==='park-height'){frame.style.height=Math.min(50000,Math.max(450,Number(m.height)||450))+'px'}else if(m.kind==='park-saved'){refreshHome()}else if(m.kind==='park-route'){if(['Explore','Trips','Waits','Passport','Memories','Settings'].includes(m.tab))currentRoute=m.tab;if(typeof m.tripId==='string')currentTrip=m.tripId;}else if(m.kind==='park-original'){if(m.tab==='trips'||m.tab==='map'||m.tab==='pick'||m.tab==='home'){if(m.tab==='home'&&typeof m.day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(m.day)){let t=state.trips.find(x=>x.id===m.tripId);if(t&&tripDays(t).includes(m.day)&&tripEnd(t)>Date.now()){showTripOnHome(t.id);openDay(m.day);return}}showTab(m.tab);window.scrollTo({top:0,behavior:'auto'})}}else if(m.kind==='park-favorite'&&typeof m.parkId==='string'&&typeof m.rideId==='string'){let p=state.parks[m.parkId];if(!p){const dest=destinations.find(d=>d.parks?.some(x=>x.id===m.parkId)), known=dest?.parks.find(x=>x.id===m.parkId);if(!known)return;state.parks[m.parkId]={name:known.name,destName:dest.name}}let f=state.favs[m.parkId]||[];state.favs[m.parkId]=m.on?[...new Set([...f,m.rideId])]:f.filter(x=>x!==m.rideId);originalSave();refreshHome();renderTicker();}});
window.addEventListener('storage',e=>{if(e.key===V2)refreshHome()});setInterval(()=>{let v=get(V2,{});if(v.galleryPrefs?.rotation!==false&&!homeGallery.paused&&!document.hidden&&!galleryCard.hidden&&!document.querySelector('[data-panel="home"]').hidden){photoIndex++;refreshHome()}},15000);
const originalGetLive=getLive;getLive=async function(parkId,force){const rows=await originalGetLive(parkId,force);try{const observed=liveCache[parkId]?.at||Date.now(), key='parkCountdown.v2.originalLive', samples=get(key,{}), current=samples[parkId]||{at:0,history:{},statuses:{}};if(observed>current.at){current.at=observed;for(const r of rows){current.statuses[r.id]=r.status;const wait=r.queue?.STANDBY?.waitTime;if(r.status==='OPERATING'&&Number.isFinite(wait)){const h=current.history[r.id]||[];if(!h.length||observed-h[h.length-1].at>=60000)h.push({at:observed,w:wait});current.history[r.id]=h.slice(-72)}}samples[parkId]=current;localStorage.setItem(key,JSON.stringify(samples))}}catch(e){}return rows};
refreshHome();updateArtStatus();loadResortArt().catch(err=>{artStatus.textContent='Resort picture storage unavailable: '+err.message});if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{});
window.parkPictures={intro:picturesIntro,art:artTransaction,loadArt:loadResortArt,counts:updatePictureCounts,afterImport(fn){const base=importPictures;importPictures=async function(files){const r=await base(files);try{fn()}catch{}return r}}};
})();

/* ---------- Smart wait predictions + walking map (roadmap 07 / 10) ---------- */
(()=>{'use strict';
const nav=document.querySelector('.tabs'),wrap=document.querySelector('.wrap');if(!nav||!wrap)return;
const h=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n};
const css=h('style');css.textContent=`.sp-controls{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sp-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.sp-chips button{padding:6px 10px;font-size:.85rem}.sp-chips button.on{border-color:var(--gold);color:var(--gold)}
.sp-ride{border-top:1px solid var(--line);padding:10px 0}.sp-ride h3{margin:0;font-size:1rem;display:flex;justify-content:space-between;gap:8px}.sp-ride h3 b{color:var(--gold);white-space:nowrap}
.sp-bars{display:flex;align-items:flex-end;gap:1px;height:46px;margin-top:6px}.sp-bars i{flex:1;background:#7c86ff88;border-radius:2px 2px 0 0;min-height:2px}.sp-bars i.best{background:#5ee0a0}.sp-bars i.at{outline:2px solid var(--gold)}
.sp-axis{display:flex;justify-content:space-between;font-size:.68rem;color:var(--mute)}.sp-plan li{margin:6px 0}.sp-note{font-size:.82rem;color:var(--mute)}
.wk-dist{background:#141637e8;color:#fff;border-radius:12px;padding:8px 10px;font:600 13px/1.35 system-ui;box-shadow:0 4px 14px #0007}.wk-dist small{display:block;font-weight:400;opacity:.8}
.wk-mile{background:var(--gold,#f5c86b);color:#141637;border-radius:10px;font:700 10px/16px system-ui;padding:0 5px;white-space:nowrap;box-shadow:0 1px 4px #0008}`;document.head.append(css);

/* ---- predictions page ---- */
const btn=h('button',null,'Wait predictions');btn.type='button';btn.dataset.tab='predict';btn.onclick=()=>showTab('predict');
const before=nav.querySelector('button[data-tab="extras"]');nav.insertBefore(btn,before||null);
const panel=h('section','card');panel.dataset.panel='predict';panel.hidden=true;wrap.append(panel);
panel.innerHTML=`<h2 style="margin-top:0">Smart wait predictions</h2><p class="sp-note" style="margin-top:0">Predicted standby waits by time of day for any date, based on posted waits collected every 15 minutes and adjusted for expected crowds. Today also uses the park's own forecast.</p>
<div class="sp-controls"><div><label for="spPark">Park</label><select id="spPark"></select></div><div><label for="spDate">Date</label><input id="spDate" type="date"></div></div>
<div class="sp-chips" id="spDays"></div>
<div class="sp-controls" style="margin-top:4px"><div><label for="spTime">Arriving at the ride around</label><select id="spTime"></select></div><div><label for="spShow">Show</label><select id="spShow"><option value="fav">My rides</option><option value="all">All rides</option></select></div></div>
<div id="spStatus" class="sp-note" style="margin-top:10px"></div><div id="spPlan"></div><div id="spList"></div>`;
const $p=s=>panel.querySelector(s);
const slotLabel=s=>new Date(2000,0,1,Math.floor(s/2),(s%2)*30).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
for(let s=12;s<48;s++){const o=h('option',null,slotLabel(s));o.value=s;$p('#spTime').append(o)}
let reqSeq=0;
function destOfPark(pid){return destinations.find(d=>(d.parks||[]).some(p=>p.id===pid))}
function parkChoices(){const t=nextTrip(),seen=new Map();const add=(id,name)=>{if(id&&!isExtra(id)&&!seen.has(id))seen.set(id,name||state.parks?.[id]?.name||'Park')};
 if(t){for(const d of tripDays(t))for(const id of dayPlan(t,d))add(id,parkName(t,id));for(const p of parksForDest(t.destId))add(p.id,p.name)}
 for(const [id,p] of Object.entries(state.parks||{}))add(id,p.name);return [...seen]}
function setup(){const sel=$p('#spPark'),cur=sel.value,list=parkChoices();sel.replaceChildren(...list.map(([id,name])=>{const o=h('option',null,name);o.value=id;return o}));
 if(!list.length){$p('#spStatus').textContent='Pick a resort and parks on Parks & Rides first.';return false}
 const t=nextTrip(),days=t?tripDays(t):[];const dateIn=$p('#spDate');
 if(!dateIn.value){const today=todayIn(t?.tz);dateIn.value=days.find(d=>d>=today&&dayPlan(t,d).some(id=>!isExtra(id)))||days[0]||today;}
 const planned=t?dayPlan(t,dateIn.value).find(id=>!isExtra(id)):null;sel.value=list.some(([id])=>id===cur)?cur:(planned&&list.some(([id])=>id===planned)?planned:list[0][0]);
 const chips=$p('#spDays');chips.replaceChildren();if(t)days.forEach((d,i)=>{const parks=dayPlan(t,d).filter(id=>!isExtra(id));if(!parks.length)return;const b=h('button',d===dateIn.value?'on':'',`Day ${i+1} · ${parkName(t,parks[0]).replace(/^Disney'?s? /,'').replace(/ Theme Park| Park$/,'')}`);b.type='button';b.onclick=()=>{dateIn.value=d;sel.value=parks[0];load()};chips.append(b)});
 if(!$p('#spTime').dataset.set){$p('#spTime').value=String(19);$p('#spTime').dataset.set='1'}return true}
function crowdFactor(destId,date,sampled){try{if(typeof crowd!=='function'||!sampled?.length)return 1;const score=d=>{const v=Number(crowd(d,destId));return Number.isFinite(v)?Math.min(10,Math.max(1,v)):5};const avg=sampled.reduce((a,d)=>a+score(d),0)/sampled.length;const f=(0.55+0.075*score(date))/(0.55+0.075*avg);return Math.min(1.6,Math.max(0.6,f))}catch{return 1}}
async function rpc(name,args){if(name==='predict_waits'){const A=window.parkAccount;if(!A||!A.user())throw Error('PLUS_REQUIRED');const r=await A.rpc(name,args);if(r.error)throw Error(/PLUS_REQUIRED/.test(r.error.message||'')?'PLUS_REQUIRED':'Prediction service unavailable.');return r.data||[]}const cfg=window.PARK_ACCOUNTS||{};if(!cfg.url||!cfg.key)throw Error('Prediction service is not configured.');const r=await fetch(cfg.url.replace(/\/$/,'')+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:cfg.key,authorization:'Bearer '+cfg.key,'content-type':'application/json'},body:JSON.stringify(args)});if(!r.ok)throw Error('Prediction service unavailable ('+r.status+').');return r.json()}
async function todayForecast(parkId){try{const j=await getJSON(`/entity/${parkId}/live`);const out={};for(const x of j.liveData||[]){if(x.entityType!=='ATTRACTION')continue;const f={};for(const p of x.forecast||[]){const m=String(p.time||'').match(/T(\d{2}):(\d{2})/);if(m&&Number.isFinite(p.waitTime)){const s=(+m[1])*2+(+m[2]>=30?1:0);f[s]=p.waitTime;f[s+1]??=p.waitTime}}out[x.id]={name:x.name,now:x.status==='OPERATING'?x.queue?.STANDBY?.waitTime:null,status:x.status,f}}return out}catch{return {}}}
function bestWindow(slots){let best=null;for(const [s,w] of slots){if(best==null||w<best.w)best={s,w}}return best}
function planDay(rides,startSlot){ // greedy: always ride whatever is furthest below its own daily average right now
 const left=rides.filter(r=>r.slots.size),out=[];let t=startSlot*30;
 while(left.length&&t<24*60){const s=Math.floor(t/30);let pick=null,score=Infinity;for(const r of left){const w=near(r.slots,s);if(w==null)continue;const sc=w-r.avg*0.85;if(sc<score){score=sc;pick=r}}if(!pick){t+=30;continue}const w=near(pick.slots,s);out.push({r:pick,s,w});left.splice(left.indexOf(pick),1);t+=w+20}
 return out}
function near(map,s){if(map.has(s))return map.get(s);if(map.has(s-1)&&map.has(s+1))return Math.round((map.get(s-1)+map.get(s+1))/2);return null}
async function load(){if(!setup())return;const seq=++reqSeq,parkId=$p('#spPark').value,date=$p('#spDate').value,at=+$p('#spTime').value,showAll=$p('#spShow').value==='all';
 const status=$p('#spStatus'),list=$p('#spList'),plan=$p('#spPlan');status.textContent='Loading predictions…';list.replaceChildren();plan.replaceChildren();
 $p('#spDays').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.textContent.startsWith('Day ')&&nextTrip()&&tripDays(nextTrip())[parseInt(b.textContent.slice(4))-1]===date));
 const dest=destOfPark(parkId),destId=dest?.id||nextTrip()?.destId,tz=dest?.timezone||nextTrip()?.tz,isToday=date===todayIn(tz);
 let rows=[],stat=null,err='';try{[rows,stat]=await Promise.all([rpc('predict_waits',{p_park:parkId,p_date:date}),destId?rpc('wait_prediction_status',{p_dest:destId}):null])}catch(e){err=e.message}
 const live=isToday?await todayForecast(parkId):{};if(seq!==reqSeq)return;
 const factor=isToday?1:crowdFactor(destId,date,stat?.sampled_days);const rides=new Map();
 for(const r of rows||[]){let x=rides.get(r.ride_id);if(!x)rides.set(r.ride_id,x={id:r.ride_id,name:r.name,slots:new Map(),days:r.days,spread:new Map()});x.slots.set(r.slot,Math.round(r.wait*factor/5)*5);x.spread.set(r.slot,r.spread)}
 for(const [id,l] of Object.entries(live)){if(!Object.keys(l.f).length)continue;let x=rides.get(id);if(!x)rides.set(id,x={id,name:l.name,slots:new Map(),days:0,spread:new Map()});for(const [s,w] of Object.entries(l.f)){const old=x.slots.get(+s);x.slots.set(+s,old==null?w:Math.round((w*0.6+old*0.4)/5)*5)}x.now=l.now;x.status=l.status}
 const favs=new Set(state.favs?.[parkId]||[]);let shown=[...rides.values()].filter(r=>r.slots.size&&(showAll||!favs.size||favs.has(r.id)));
 for(const r of shown){const v=[...r.slots.values()];r.avg=v.reduce((a,b)=>a+b,0)/v.length;r.best=bestWindow(r.slots)}
 shown.sort((a,b)=>(favs.has(b.id)-favs.has(a.id))||(b.avg-a.avg));
 const days=stat?.days||0,since=stat?.first_day?fmtDay(stat.first_day,{month:'short',day:'numeric'}):'';
 const locked=err==='PLUS_REQUIRED';if(locked)err='';status.textContent=err?err:locked&&!Object.keys(live).length?'':!rows?.length&&!Object.keys(live).length?(days?'No history for this park yet. Check back after it has been open for a day.':'Still learning: wait history started collecting today. Predictions appear after the first park day, and get sharper every week.'):
  `${isToday?'Today: park forecast blended with history':'Based on '+days+' day'+(days===1?'':'s')+' of wait history'+(since?' since '+since:'')}${!isToday&&factor!==1?` · adjusted ${factor>1?'up':'down'} ${Math.round(Math.abs(factor-1)*100)}% for expected crowds`:''}${days&&days<14&&!isToday?' · still learning, so treat these as rough':''}${!showAll&&!favs.size?' · showing all rides (no favorites picked for this park)':''}`;
 if(locked){if(Object.keys(live).length)status.textContent='Showing the park’s own forecast for today.';const b=h('button','primary','See Plus');b.type='button';b.style.marginLeft='8px';b.onclick=()=>window.parkAccount&&window.parkAccount.upgrade('Smart wait predictions are part of Plus.');status.append(h('span',null,' Predictions for any date, best times and a suggested ride order are part of Plus.'),b)}
 if(!shown.length)return;
 if(shown.length>1&&!locked){const steps=planDay(shown.slice(0,showAll?12:20),Math.max(12,Math.min(...shown.flatMap(r=>[...r.slots.keys()]))));if(steps.length>1){const sum=steps.reduce((a,x)=>a+x.w,0),naive=steps.reduce((a,x)=>a+x.r.avg,0);const box=h('div','card');box.style.margin='12px 0 0';box.append(h('h3',null,'Suggested ride order'),h('p','sp-note',`About ${Math.round(sum)} min of waiting in total${naive-sum>=5?`, roughly ${Math.round(naive-sum)} min less than riding them at typical times`:''}. Allows about 20 min to ride and walk between each.`));const ol=h('ol','sp-plan');for(const x of steps)ol.append(h('li',null,`${slotLabel(x.s)} · ${x.r.name} · ~${x.w} min`));box.append(ol);plan.append(box)}}
 for(const r of shown){const c=h('div','sp-ride');const atW=near(r.slots,at);const head=h('h3');head.append(h('span',null,(favs.has(r.id)?'★ ':'')+r.name),h('b',null,atW!=null?`~${atW} min at ${slotLabel(at)}`:'closed then'));c.append(head);
  const keys=[...r.slots.keys()].sort((a,b)=>a-b),lo=keys[0],hi=keys[keys.length-1],max=Math.max(...r.slots.values(),10);const bars=h('div','sp-bars');
  for(let s=lo;s<=hi;s++){const w=r.slots.get(s);const i=h('i');i.style.height=(w==null?0:Math.max(4,w/max*100))+'%';i.title=slotLabel(s)+(w==null?'':' · '+w+' min');if(r.best&&w===r.best.w)i.classList.add('best');if(s===at)i.classList.add('at');bars.append(i)}
  const axis=h('div','sp-axis');axis.append(h('span',null,slotLabel(lo)),h('span',null,slotLabel(Math.round((lo+hi)/2))),h('span',null,slotLabel(hi)));
  const sp=r.spread.get(at);c.append(bars,axis,h('p','sp-note',`Best: ${slotLabel(r.best.s)} (~${r.best.w} min) · Busiest: ${slotLabel([...r.slots].sort((a,b)=>b[1]-a[1])[0][0])} (~${Math.max(...r.slots.values())} min)${r.now!=null?` · Posted now: ${r.now} min`:r.status&&r.status!=='OPERATING'&&isToday?' · '+r.status.toLowerCase():''}${sp?` · usually ±${sp} min`:''}`));list.append(c)}}
for(const id of ['#spPark','#spDate','#spTime','#spShow'])$p(id).addEventListener('change',load);
const prevShow=showTab;showTab=function(t){prevShow(t);if(t==='predict')load()};

/* ---- walking map: route for the chosen day, mile markers and distance traveled ---- */
let marks=null,distBox=null,fitDay='';
function routeMeters(pts){let m=0;for(let i=1;i<pts.length;i++)m+=hav({lat:pts[i-1][0],lng:pts[i-1][1]},{lat:pts[i][0],lng:pts[i][1]});return m}
const prevDraw=drawPath;drawPath=function(){prevDraw();if(!map||!pathLayer||typeof L==='undefined')return;
 const today=localHourKey(Date.now()).slice(0,10),day=walkDay||today,pts=walk.paths?.[day]||[];pathLayer.setLatLngs(pts);
 if(!marks)marks=L.layerGroup().addTo(map);marks.clearLayers();
 if(pts.length){L.circleMarker(pts[0],{radius:7,color:'#fff',weight:2,fillColor:'#5ee0a0',fillOpacity:1}).bindTooltip('Start').addTo(marks);if(pts.length>1)L.circleMarker(pts[pts.length-1],{radius:7,color:'#fff',weight:2,fillColor:'#ff6b8b',fillOpacity:1}).bindTooltip(day===today?'Latest':'Finish').addTo(marks);
  let acc=0,next=1609.344,mile=1;for(let i=1;i<pts.length&&mile<100;i++){acc+=hav({lat:pts[i-1][0],lng:pts[i-1][1]},{lat:pts[i][0],lng:pts[i][1]});if(acc>=next){L.marker(pts[i],{icon:L.divIcon({className:'',html:`<span class="wk-mile">${mile} mi</span>`,iconSize:null}),interactive:false}).addTo(marks);mile++;next+=1609.344}}}
 if(!distBox){const C=L.Control.extend({onAdd(){const d=L.DomUtil.create('div','wk-dist');L.DomEvent.disableClickPropagation(d);return d}});distBox=new C({position:'topright'}).addTo(map).getContainer()}
 const route=routeMeters(pts),total=dayTotal(day),t=nextTrip(),td=t?tripDays(t):[],tripM=td.reduce((a,d)=>a+dayTotal(d),0);const steps=Math.round(Math.max(route,total)/0.75/100)*100;
 distBox.innerHTML=`${day===today?'Today':fmtDay(day,{weekday:'short',month:'short',day:'numeric'})}: ${fmtMi(Math.max(total,route))}<small>${pts.length?'Route on map '+fmtMi(route):'No GPS route recorded this day'}${steps?' · ~'+steps.toLocaleString()+' steps':''}</small>${t&&td.length?`<small>${esc(t.name)}: ${fmtMi(tripM)} total</small>`:''}`;
 if(pts.length>1&&fitDay!==day){fitDay=day;try{map.fitBounds(L.latLngBounds(pts),{padding:[30,30],maxZoom:18})}catch{}}};
const prevStats=renderWalkStats;renderWalkStats=function(){prevStats();const sel=document.querySelector('#walkDaySel');if(sel){sel.onchange=e=>{walkDay=e.target.value;renderWalkStats();drawPath();document.querySelector('#map')?.scrollIntoView({behavior:'smooth',block:'center'})}}};
})();

/* ---------- Trip planner guide (Home) + News & videos ---------- */
(()=>{'use strict';
const nav=document.querySelector('.tabs'),wrap=document.querySelector('.wrap'),cal=document.querySelector('#calCard');if(!nav||!wrap)return;
const h=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n};
const css=h('style');css.textContent=`.pg-head{display:flex;justify-content:space-between;align-items:center;gap:8px;cursor:pointer}.pg-head h2{margin:0;font-size:1.05rem}.pg-bar{height:6px;border-radius:3px;background:#ffffff18;margin:10px 0 4px;overflow:hidden}.pg-bar i{display:block;height:100%;background:var(--gold);border-radius:3px}
.pg-next{border:1px solid var(--gold);border-radius:14px;padding:12px;margin-top:10px}.pg-next b{display:block;margin-bottom:2px}.pg-next button{margin-top:8px}
.pg-step{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid var(--line)}.pg-step .pg-dot{flex:0 0 26px;height:26px;border-radius:50%;border:2px solid var(--line);display:grid;place-items:center;font-size:.8rem;background:none;padding:0;min-height:0;color:inherit}.pg-step.done .pg-dot{background:#5ee0a0;border-color:#5ee0a0;color:#141637}.pg-step.done .pg-t{opacity:.65}
.pg-step .pg-body{flex:1;min-width:0}.pg-t{font-weight:600}.pg-s{font-size:.84rem;color:var(--mute);margin:2px 0 0}.pg-step .pg-go{flex:0 0 auto;padding:6px 12px;font-size:.85rem}
.nv-bar{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.nv-bar button{padding:6px 12px;font-size:.88rem}.nv-bar button.on{border-color:var(--gold);color:var(--gold)}
.nv-item{display:flex;gap:10px;padding:10px 0;border-top:1px solid var(--line);align-items:flex-start}.nv-item a{color:inherit;text-decoration:none;font-weight:600}.nv-item .nv-meta{font-size:.78rem;color:var(--mute);margin-top:3px}
.nv-thumb{flex:0 0 120px;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:#0006;position:relative;padding:0;border:0;min-height:0}.nv-thumb img{width:100%;height:100%;object-fit:cover;display:block}.nv-thumb::after{content:"▶";position:absolute;inset:0;display:grid;place-items:center;color:#fff;font-size:1.3rem;text-shadow:0 1px 6px #000}
.nv-player{width:100%;aspect-ratio:16/9;border:0;border-radius:12px;margin-top:8px;background:#000}.nv-blog{flex:0 0 34px;height:34px;border-radius:9px;background:#ffffff14;display:grid;place-items:center;font-size:.95rem}
.nv-src{font-size:.82rem;color:var(--mute)}.nv-src span{display:inline-block;margin:2px 6px 2px 0}.nv-src span.off{text-decoration:line-through;opacity:.6}`;document.head.append(css);
const store=(k,v)=>{try{if(v===undefined)return JSON.parse(localStorage.getItem(k)||'null');localStorage.setItem(k,JSON.stringify(v))}catch{return null}};

/* ---- trip planner guide ---- */
const GKEY='parkCountdown.guide';const WDW='e957da41-3552-4cf6-b636-5babc5cbc4e5';
const guide=h('section','card');guide.id='planGuide';guide.hidden=true;if(cal)cal.before(guide);else return;
const gs=()=>store(GKEY)||{};const gset=(tripId,k,v)=>{const s=gs();(s[tripId]=s[tripId]||{})[k]=v;store(GKEY,s)};
const when=(ms,tz)=>new Date(ms).toLocaleString(undefined,Object.assign({weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'},tz?{timeZone:tz}:{}));
const inDays=ms=>{const d=Math.ceil((ms-Date.now())/864e5);return d<=0?'now':d===1?'tomorrow':'in '+d+' days'};
function steps(t){const s=gs()[t.id]||{},days=tripDays(t),planned=days.filter(d=>dayPlan(t,d).length),parks=[...new Set(days.flatMap(d=>dayPlan(t,d)).filter(id=>!isExtra(id)))],picked=parks.filter(id=>(state.favs?.[id]||[]).length);
 let crowdTip='';try{const sc=days.map(d=>[d,Number(crowd(d,t.destId))]).filter(x=>Number.isFinite(x[1]));if(sc.length>1){const lo=sc.reduce((a,b)=>b[1]<a[1]?b:a),hi=sc.reduce((a,b)=>b[1]>a[1]?b:a);if(lo[1]!==hi[1])crowdTip=` Quietest day: ${fmtDay(lo[0],{weekday:'short',month:'short',day:'numeric'})} (${lo[1]}/10), busiest: ${fmtDay(hi[0],{weekday:'short',month:'short',day:'numeric'})} (${hi[1]}/10). Put your biggest park on the quietest day.`}}catch{}
 const out=[{id:'days',title:'Choose a park for each day',sub:`${planned.length} of ${days.length} days planned.${crowdTip}`,done:planned.length===days.length,go:['Open calendar',()=>cal.scrollIntoView({behavior:'smooth',block:'start'})]},
  {id:'rides',title:'Pick your must-do rides',sub:parks.length?`${picked.length} of ${parks.length} parks have favorites. They drive your queue times, predictions and ride order.`:'Choose parks first, then star the rides you care about.',done:parks.length>0&&picked.length===parks.length,go:['Parks & Rides',()=>showTab('pick')]}];
 let dining=0;try{dining=resTime(t)}catch{}
 if(dining)out.push({id:'dining',title:'Book dining and extras',sub:`Booking opens ${inDays(dining)}: ${when(dining,t.tz)} resort time (60 days before check-in). Popular tables go within minutes.`,done:!!s.dining,manual:true,go:['Reservations',()=>{const b=[...document.querySelectorAll('#pcMenu button')].find(x=>/^Reservations/.test(x.textContent));if(b)b.click();else showTab('extras')}]});
 if(t.destId===WDW){let a=0,b=0;try{a=zonedTime(addDays(t.date,-7),'07:00',t.tz||'America/New_York');b=zonedTime(addDays(t.date,-3),'07:00',t.tz||'America/New_York')}catch{}
  if(a)out.push({id:'ll',title:'Buy Lightning Lane passes',sub:`Staying at a Disney hotel: booking opens ${inDays(a)}, ${when(a,t.tz)} resort time (7 days before check-in, whole stay). Staying elsewhere: 3 days before each park day (first day ${when(b,t.tz)}). Check Disney's site for current rules.`,done:!!s.ll,manual:true})}
 out.push({id:'pred',title:'Check predicted waits and ride order',sub:'See the best time for each ride on each park day and a suggested order.',done:!!s.pred,go:['Wait predictions',()=>{gset(t.id,'pred',true);showTab('predict')}]},
  {id:'news',title:'Catch up on news and tips',sub:'Latest Disney blog posts and vlogs: closures, new rides, food and planning tips.',done:!!s.news,go:['News & videos',()=>{gset(t.id,'news',true);showTab('news')}]});
 return out}
function renderGuide(){let t=null;try{t=nextTrip()}catch{}let started=false;try{started=t&&Date.now()>tripTime(t)}catch{}
 if(!t||started||(typeof homeDay!=='undefined'&&homeDay)){guide.hidden=true;return}guide.hidden=false;
 const list=steps(t),done=list.filter(x=>x.done).length,next=list.find(x=>!x.done),open=!gs().collapsed;
 const sig=JSON.stringify([t.id,open,list.map(x=>[x.done,x.sub])]);if(guide.dataset.sig===sig)return;guide.dataset.sig=sig;guide.replaceChildren();
 const head=h('div','pg-head');head.append(h('h2',null,'Trip planner'),h('span','muted',`${done} of ${list.length} done ${open?'▾':'▸'}`));head.setAttribute('role','button');head.tabIndex=0;head.setAttribute('aria-expanded',String(open));
 const toggle=()=>{const s=gs();s.collapsed=open;store(GKEY,s);renderGuide()};head.onclick=toggle;head.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}};
 const bar=h('div','pg-bar'),fill=h('i');fill.style.width=Math.round(done/list.length*100)+'%';bar.append(fill);guide.append(head,bar);
 if(next){const box=h('div','pg-next');box.append(h('b',null,'Next: '+next.title),h('span','pg-s',next.sub));if(next.go){const b=h('button','primary',next.go[0]);b.type='button';b.onclick=next.go[1];box.append(document.createElement('br'),b)}guide.append(box)}else guide.append(h('p','pg-s','All set. Enjoy the countdown!'));
 if(!open)return;
 for(const x of list){if(x===next&&!x.manual)continue;const r=h('div','pg-step'+(x.done?' done':''));const dot=h(x.manual?'button':'span','pg-dot',x.done?'✓':'');if(x.manual){dot.type='button';dot.setAttribute('aria-label',(x.done?'Mark not done: ':'Mark done: ')+x.title);dot.onclick=()=>{gset(t.id,x.id,!x.done);renderGuide()}}
  const body=h('div','pg-body');body.append(h('div','pg-t',x.title),h('p','pg-s',x.sub+(x.manual&&!x.done?' Tap the circle when done.':'')));r.append(dot,body);if(x.go&&x!==next){const b=h('button','pg-go',x.go[0]);b.type='button';b.onclick=x.go[1];r.append(b)}guide.append(r)}}
const prevHome=renderHome;renderHome=function(){prevHome();try{renderGuide()}catch(e){console.warn('guide',e)}};
const prevShow0=showTab;showTab=function(t){prevShow0(t);if(t==='home'){try{renderGuide()}catch{}}if(t==='predict'){try{const n=nextTrip();if(n)gset(n.id,'pred',true)}catch{}}};
setTimeout(()=>{try{renderGuide()}catch{}},600);

/* ---- news & videos ---- */
const CKEY='parkCountdown.feeds.channels';
const btn=h('button',null,'News & videos');btn.type='button';btn.dataset.tab='news';btn.onclick=()=>showTab('news');nav.insertBefore(btn,nav.querySelector('button[data-tab="extras"]')||null);
const panel=h('section','card');panel.dataset.panel='news';panel.hidden=true;wrap.append(panel);
panel.innerHTML=`<h2 style="margin-top:0">News & videos</h2><p class="pg-s" style="margin-top:0">The latest from Disney planning blogs and YouTube vloggers. Tap a video to play it here, or a headline to read it on the blog.</p>
<div class="nv-bar" id="nvKind"></div><label for="nvFind">Search headlines</label><input id="nvFind" type="search" placeholder="e.g. Tron, EPCOT, dining" autocomplete="off">
<div id="nvStatus" class="pg-s" style="margin-top:10px"></div><div id="nvList"></div>
<details style="margin-top:14px"><summary style="cursor:pointer;font-weight:600">Sources & my YouTube channels</summary><div id="nvSrc" class="nv-src" style="margin-top:8px"></div>
<label for="nvAdd" style="margin-top:10px">Add a YouTube channel</label><div style="display:flex;gap:8px"><input id="nvAdd" placeholder="@handle or channel link" autocomplete="off" autocapitalize="off"><button type="button" id="nvAddBtn">Add</button></div><div id="nvMine" class="nv-src" style="margin-top:8px"></div></details>`;
const $n=s=>panel.querySelector(s);let data=null,kind='all',loading=false,loadedAt=0,shown=30;
const mine=()=>{const v=store(CKEY);return Array.isArray(v)?v.filter(x=>typeof x==='string').slice(0,8):[]};
function cleanChannel(raw){let s=String(raw||'').trim();const id=s.match(/(UC[\w-]{22})(?![\w-])/);if(id&&(s===id[1]||/channel\//.test(s)))return id[1];s=s.replace(/^https?:\/\/(www\.|m\.)?youtube\.com\//i,'').replace(/^@/,'').split(/[/?#]/)[0];return /^[\w.-]{2,40}$/.test(s)?s:''}
function tripWords(){try{const t=nextTrip();if(!t)return null;const w=new Set();const dest=String(t.destName||'').replace(/\(.*?\)/g,'').trim();if(dest)w.add(dest);if(t.destId===WDW)w.add('WDW');const names=[...(parksForDest(t.destId)||[]).map(p=>p.name),...tripDays(t).flatMap(d=>dayPlan(t,d)).map(id=>parkName(t,id))];for(const pn of names){const p={name:pn};const n=String(p.name||'').replace(/^Disney'?s?\s+/i,'').replace(/\s+(Theme\s+)?Park$/i,'').trim();if(n.length>3)w.add(n)}
 if(!w.size)return null;return new RegExp([...w].map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'i')}catch{return null}}
const ago=d=>{const t=Date.parse(d);if(!Number.isFinite(t))return '';const m=Math.max(0,Math.round((Date.now()-t)/6e4));return m<60?m+' min ago':m<1440?Math.round(m/60)+' hr ago':m<10080?Math.round(m/1440)+' days ago':new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric'})};
const safe=u=>{try{const x=new URL(u);return x.protocol==='https:'?x.href:''}catch{return ''}};
function draw(){const kinds=[['all','All'],['video','Videos'],['blog','Blogs']];const tw=tripWords();if(tw)kinds.push(['trip','For my trip']);
 $n('#nvKind').replaceChildren(...kinds.map(([k,l])=>{const b=h('button',kind===k?'on':'',l);b.type='button';b.onclick=()=>{kind=k;shown=30;draw()};return b}));
 const list=$n('#nvList'),status=$n('#nvStatus');list.replaceChildren();if(!data){status.textContent=loading?'Loading the latest…':status.textContent;return}
 const q=$n('#nvFind').value.trim().toLowerCase();let items=data.items.filter(x=>(kind==='all'||kind==='trip'||x.kind===kind)&&(kind!=='trip'||!tw||tw.test(x.title))&&(!q||(x.title+' '+x.source).toLowerCase().includes(q)));
 status.textContent=items.length?`${items.length} recent ${kind==='video'?'videos':kind==='blog'?'posts':'posts and videos'} · updated ${ago(data.updated)}`:q?'Nothing recent matches that.':'Nothing to show right now.';
 if(q){const a=h('a',null,`Search YouTube for “${$n('#nvFind').value.trim()}”`);a.href='https://www.youtube.com/results?search_query='+encodeURIComponent($n('#nvFind').value.trim()+' Disney');a.target='_blank';a.rel='noopener';a.style.cssText='display:inline-block;margin:8px 0;color:var(--gold)';list.append(a)}
 for(const x of items.slice(0,shown)){const link=safe(x.link);if(!link)continue;const row=h('div','nv-item'),body=h('div');body.style.cssText='flex:1;min-width:0';const a=h('a',null,x.title);a.href=link;a.target='_blank';a.rel='noopener';body.append(a,h('div','nv-meta',`${x.source}${x.date?' · '+ago(x.date):''}`));
  if(x.kind==='video'&&/^[\w-]{11}$/.test(x.videoId||'')){const tb=h('button','nv-thumb');tb.type='button';tb.setAttribute('aria-label','Play: '+x.title);const img=h('img');img.loading='lazy';img.alt='';img.src='https://i.ytimg.com/vi/'+x.videoId+'/mqdefault.jpg';tb.append(img);
   tb.onclick=()=>{list.querySelectorAll('.nv-player').forEach(p=>p.remove());const f=h('iframe','nv-player');f.src='https://www.youtube-nocookie.com/embed/'+x.videoId+'?autoplay=1&playsinline=1';f.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';f.allowFullscreen=true;f.title=x.title;body.append(f);f.scrollIntoView({behavior:'smooth',block:'center'})};row.append(tb,body)}
  else{row.append(h('span','nv-blog','📰'),body)}list.append(row)}
 if(items.length>shown){const more=h('button',null,'Show more');more.type='button';more.style.marginTop='10px';more.onclick=()=>{shown+=30;draw()};list.append(more)}
 $n('#nvSrc').replaceChildren(...data.sources.filter(s=>!s.mine).map(s=>h('span',s.ok?'':'off',(s.kind==='video'?'▶ ':'📰 ')+s.name)));
 const m=mine();$n('#nvMine').replaceChildren(...m.map(c=>{const s=h('span');const st=data.sources.find(x=>x.handle===c);s.append((st&&!st.ok?'⚠ not found: ':'▶ ')+(st?.ok?st.name:c)+' ');const rm=h('button',null,'Remove');rm.type='button';rm.style.cssText='padding:2px 8px;font-size:.75rem;min-height:0';rm.onclick=()=>{store(CKEY,mine().filter(v=>v!==c));load(true)};s.append(rm);return s}))}
async function load(force){if(loading)return;if(!force&&data&&Date.now()-loadedAt<15*60e3){draw();return}loading=true;if(!data)$n('#nvStatus').textContent='Loading the latest…';
 try{const m=mine();const r=await fetch('/api/feeds'+(m.length?'?yt='+encodeURIComponent(m.join(',')):''));if(!r.ok)throw Error('The news service is unavailable right now ('+r.status+').');const j=await r.json();if(!Array.isArray(j.items))throw Error('The news service sent something unexpected.');data={updated:j.updated,items:j.items.filter(x=>x&&typeof x.title==='string'&&safe(x.link)),sources:Array.isArray(j.sources)?j.sources:[]};loadedAt=Date.now()}
 catch(e){if(!data)$n('#nvStatus').textContent=navigator.onLine===false?'You are offline. News needs a connection.':e.message}finally{loading=false;draw()}}
$n('#nvFind').addEventListener('input',()=>{shown=30;draw()});
const add=()=>{const c=cleanChannel($n('#nvAdd').value);if(!c){$n('#nvStatus').textContent='That does not look like a YouTube channel. Paste a link like youtube.com/@name.';return}const m=mine();if(m.length>=8){$n('#nvStatus').textContent='You can add up to 8 channels. Remove one first.';return}if(!m.some(v=>v.toLowerCase()===c.toLowerCase()))store(CKEY,[...m,c]);$n('#nvAdd').value='';load(true)};
$n('#nvAddBtn').onclick=add;$n('#nvAdd').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();add()}});
const prevShow=showTab;showTab=function(t){prevShow(t);if(t==='news')load(false);else panel.querySelectorAll('.nv-player').forEach(p=>p.remove())};
})();

/* ---------- Plus: locked features, and picture backup to the account ---------- */
(()=>{'use strict';
const A=()=>window.parkAccount||null,plus=()=>!!(A()&&A().plus());
const h=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n};
/* trip planner is a Plus feature: free accounts see what it does and how to turn it on */
const guide=document.querySelector('#planGuide');
function lockGuide(){if(!guide||guide.hidden)return;if(plus()){if(guide.dataset.locked){delete guide.dataset.locked;guide.dataset.sig='';try{renderHome()}catch{}}return}
 if(guide.dataset.locked&&guide.dataset.sig==='locked')return;guide.dataset.locked='1';guide.dataset.sig='locked';guide.replaceChildren();const head=h('div','pg-head');head.append(h('h2',null,'Trip planner'),h('span','muted','Plus'));
 const b=h('button','primary','See Plus');b.type='button';b.onclick=()=>A()&&A().upgrade('The trip planner is part of Plus.');guide.append(head,h('p','pg-s','Your next step, booking dates for dining and Lightning Lane, and the quietest day of your trip.'),b)}
const prevHome=renderHome;renderHome=function(){prevHome();try{lockGuide()}catch{}};
window.addEventListener('parkaccount:tier',()=>{try{lockGuide()}catch{}try{refreshBackupUI()}catch{}});setTimeout(()=>{try{lockGuide()}catch{}},900);

/* free accounts: one upcoming trip, and no walking tracker */
try{const form=document.querySelector('#tripForm');if(form&&form.onsubmit){const base=form.onsubmit;form.onsubmit=function(e){let extra=false;try{extra=!editingId&&upcomingTrips().length>=1}catch{}if(extra&&!plus()){e.preventDefault();if(A())A().upgrade('Free accounts keep one upcoming trip. Plus lets you plan as many as you like.');else document.querySelector('#tripErr').textContent='Sign in and turn on Plus to plan more than one trip.';return}return base.call(this,e)}}}catch{}
const lockCss=h('style');lockCss.textContent='#map.wk-locked .wk-dist,#map.wk-locked .wk-mile{display:none!important}';document.head.append(lockCss);
function walkPrompt(){const box=document.querySelector('#walkStats');if(!box||box.querySelector('.wk-plus'))return;const p=h('div','wk-plus');const b=h('button','primary','See Plus');b.type='button';b.onclick=()=>A()&&A().upgrade('Distance tracking is part of Plus.');p.append(h('p','muted','Track your route, miles and steps for each park day with Plus.'),b);box.replaceChildren(p)}
function lockWalk(){const m=document.querySelector('#map'),free=!plus();if(m)m.classList.toggle('wk-locked',free);const tb=document.querySelector('#trackBtn');if(free){walkPrompt();try{if(typeof pathLayer!=='undefined'&&pathLayer)pathLayer.setLatLngs([])}catch{}}return free}
try{const baseTrack=startTracking;startTracking=function(){if(!plus()){if(A())A().upgrade('Distance tracking is part of Plus.');return}return baseTrack()};
 const baseStats=renderWalkStats;renderWalkStats=function(){baseStats();lockWalk()};const baseDraw=drawPath;drawPath=function(){baseDraw();lockWalk()}}catch{}
window.addEventListener('parkaccount:tier',()=>{try{renderWalkStats();drawPath()}catch{}});

/* picture backup */
const P=window.parkPictures;if(!P)return;const picturesIntro=P.intro,artTransaction=P.art,loadResortArt=P.loadArt,updatePictureCounts=P.counts;
const box=h('section','card');box.dataset.panel='pictures';box.hidden=picturesIntro.hidden;const title=h('h2',null,'Account backup');title.style.marginTop='0';const status=h('p','muted');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const backupBtn=h('button','primary','Back up now'),restoreBtn=h('button',null,'Restore from account');backupBtn.type=restoreBtn.type='button';const btns=h('div');btns.style.cssText='display:flex;gap:8px;flex-wrap:wrap';btns.append(backupBtn,restoreBtn);box.append(title,status,btns);picturesIntro.after(box);
let busy=false,lastInfo='';
const hash=s=>{let a=2166136261,b=5381;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);a=Math.imul(a^c,16777619);b=(Math.imul(b,33)^c)>>>0}return (a>>>0).toString(16).padStart(8,'0')+b.toString(16).padStart(8,'0')};
const bucket=()=>{const st=A()&&A().storage();return st?st.from('pictures'):null},uid=()=>A()?.user()?.id||'';
async function localPictures(){const out=[];try{const db=await idb();await new Promise(res=>{const c=db.transaction('photos').objectStore('photos').openCursor();c.onsuccess=()=>{const cur=c.result;if(cur){if(typeof cur.value==='string'&&cur.value.startsWith('data:image/'))out.push({type:'ride',key:String(cur.key),data:cur.value});cur.continue()}else res()};c.onerror=()=>res()})}catch{}
 try{for(const r of await artTransaction('readonly',s=>s.getAll()))if(r&&r.blob)out.push({type:'resort',key:r.key,resort:r.resort,kind:r.kind,name:r.name,blob:r.blob})}catch{}return out}
const toBlob=async p=>{if(p.blob)return p.blob;const m=String(p.data).match(/^data:(image\/[\w.+-]+);base64,(.*)$/s);if(!m)throw Error('unreadable picture');const bin=atob(m[2]),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new Blob([u],{type:m[1]})};
const toDataURL=blob=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(blob)});
async function readManifest(){const b=bucket();if(!b)return null;const r=await b.download(uid()+'/manifest.json');if(r.error)return {items:[]};try{const j=JSON.parse(await r.data.text());return {items:Array.isArray(j.items)?j.items:[],saved:j.saved}}catch{return {items:[]}}}
async function backup(quiet){const b=bucket();if(!b||busy)return;if(!plus()){if(!quiet)A().upgrade('Backing up pictures to your account is part of Plus.');return}busy=true;refreshBackupUI();
 try{const local=await localPictures();if(!local.length){status.textContent='There are no pictures on this device to back up.';return}const old=await readManifest()||{items:[]},have=new Map(old.items.map(x=>[x.type+'|'+x.key,x]));const items=[];let sent=0,failed=0;
  for(let i=0;i<local.length;i++){const p=local[i],blob=await toBlob(p),file=p.type+'/'+hash(p.key)+'.img',prev=have.get(p.type+'|'+p.key);const meta={type:p.type,key:p.key,file,size:blob.size,mime:blob.type||'image/jpeg'};if(p.type==='resort')Object.assign(meta,{resort:p.resort,kind:p.kind,name:p.name});
   if(prev&&prev.size===blob.size&&prev.file===file){items.push(meta);continue}if(blob.size>1048576){failed++;continue}status.textContent=`Backing up… ${i+1} of ${local.length}`;
   const r=await b.upload(uid()+'/'+file,blob,{upsert:true,contentType:/^image\/(jpeg|png|webp)$/.test(blob.type)?blob.type:'image/jpeg'});if(r.error){failed++;if(/PLUS|row-level|policy|quota|limit/i.test(r.error.message||'')&&sent===0&&failed>2)throw Error(r.error.message)}else{items.push(meta);sent++}}
  const m=await b.upload(uid()+'/manifest.json',new Blob([JSON.stringify({schema:1,saved:new Date().toISOString(),items})],{type:'application/json'}),{upsert:true,contentType:'application/json'});if(m.error)throw Error(m.error.message);
  lastInfo=`${items.length} pictures backed up to your account${failed?` · ${failed} could not be saved`:''}.`;status.textContent=lastInfo}
 catch(e){status.textContent='Backup did not finish: '+(e.message||'try again')+'. Your pictures are still on this device.'}finally{busy=false;refreshBackupUI(true)}}
async function restore(){const b=bucket();if(!b||busy)return;busy=true;refreshBackupUI();
 try{const m=await readManifest();if(!m||!m.items.length){status.textContent='No backup found in your account yet.';return}const local=new Set((await localPictures()).map(p=>p.type+'|'+p.key));const todo=m.items.filter(x=>x&&typeof x.key==='string'&&/^(ride|resort)\/[0-9a-f]{16}\.img$/.test(x.file||'')&&!local.has(x.type+'|'+x.key));
  if(!todo.length){status.textContent='Everything in your backup is already on this device.';return}let got=0,failed=0;const db=await idb();
  for(let i=0;i<todo.length;i++){const x=todo[i];status.textContent=`Restoring… ${i+1} of ${todo.length}`;const r=await b.download(uid()+'/'+x.file);if(r.error||!r.data||!/^image\//.test(r.data.type||x.mime||'')){failed++;continue}const blob=r.data.type?r.data:new Blob([r.data],{type:x.mime||'image/jpeg'});
   try{if(x.type==='ride'){const data=await toDataURL(blob);await new Promise((res,rej)=>{const tx=db.transaction('photos','readwrite');tx.objectStore('photos').put(data,x.key);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}else await artTransaction('readwrite',s=>s.put({key:x.key,resort:String(x.resort||''),kind:x.kind,name:x.name,blob}));got++}catch{failed++}}
  try{await loadPhotos()}catch{}try{await loadResortArt()}catch{}try{updatePictureCounts()}catch{}status.textContent=`Restored ${got} picture${got===1?'':'s'}${failed?` · ${failed} could not be restored`:''}.`}
 catch(e){status.textContent='Restore did not finish: '+(e.message||'try again')+'.'}finally{busy=false;refreshBackupUI(true)}}
function refreshBackupUI(keep){const signedIn=!!uid();backupBtn.disabled=restoreBtn.disabled=busy;restoreBtn.hidden=!signedIn;backupBtn.textContent=!signedIn?'Sign in to back up':plus()?'Back up now':'Back up with Plus';
 if(busy||keep)return;status.textContent=!signedIn?'Pictures are only saved on this device. Sign in to keep a copy in your account and get them back on any device.':lastInfo||(plus()?'Keep a copy of your pictures in your account. New uploads are backed up automatically.':'Keep a copy of your pictures in your account with Plus. Restoring is always free.')}
backupBtn.onclick=()=>{if(!uid()){A()?.signIn();return}backup(false)};restoreBtn.onclick=restore;
P.afterImport(()=>{if(uid()&&plus())backup(true)});
refreshBackupUI();setTimeout(refreshBackupUI,1500);
})();

/* ---------- Import from My Disney Experience (Trips) ---------- */
(()=>{'use strict';
const panel=document.querySelector('[data-panel="trips"]'),form=document.querySelector('#tripForm');if(!panel||!form||!window.MDXImport)return;
const h=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n};
const WDW='e957da41-3552-4cf6-b636-5babc5cbc4e5',CKEY='parkCountdown.v2.preview';
const css=h('style');css.textContent=`.mdx-card{border:1px solid var(--gold);border-radius:16px;padding:14px;margin:0 0 16px}.mdx-card h3{margin:0 0 4px}.mdx-card ol{margin:8px 0;padding-left:20px}.mdx-card li{margin:4px 0}.mdx-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.mdx-preview{margin-top:12px;border-top:1px solid var(--line);padding-top:10px}.mdx-preview ul{margin:6px 0;padding-left:18px}.mdx-preview li{margin:3px 0}.mdx-card textarea{width:100%;min-height:120px;margin-top:8px;box-sizing:border-box}`;document.head.append(css);
const card=h('section','mdx-card');card.innerHTML=`<h3>Import from My Disney Experience</h3><p class="muted" style="margin:0">Bring in your hotel, dates, park days and dining in one go.</p>
<ol class="muted" style="font-size:.9rem"><li>On disneyworld.com, sign in and open <b>My Plans</b>.</li><li>Save the page as a PDF (Share › Print › Save to Files on iPhone, or Print › Save as PDF on a computer).</li><li>Choose that PDF here.</li></ol>
<div class="mdx-row"><button type="button" class="primary" id="mdxPick">Choose My Plans PDF</button><button type="button" id="mdxPasteBtn">Paste text instead</button></div>
<div id="mdxPaste" hidden><label for="mdxText">Paste the text of your My Plans page</label><textarea id="mdxText" autocomplete="off" spellcheck="false"></textarea><div class="mdx-row"><button type="button" id="mdxRead">Read pasted text</button></div></div>
<p class="muted" id="mdxStatus" role="status" aria-live="polite" style="margin:8px 0 0"></p><div id="mdxPreview" class="mdx-preview" hidden></div>
<p class="muted" style="font-size:.8rem;margin:10px 0 0">Your file is read on this device and never uploaded.</p>`;
panel.insertBefore(card,form);
const $c=s=>card.querySelector(s),status=$c('#mdxStatus'),preview=$c('#mdxPreview');
const input=h('input');input.type='file';input.accept='application/pdf,.pdf,text/plain,.txt';input.hidden=true;card.append(input);
$c('#mdxPick').onclick=()=>input.click();$c('#mdxPasteBtn').onclick=()=>{$c('#mdxPaste').hidden=!$c('#mdxPaste').hidden;if(!$c('#mdxPaste').hidden)$c('#mdxText').focus()};
input.onchange=async()=>{const f=input.files?.[0];input.value='';if(!f)return;status.textContent='Reading '+(f.name||'your file')+'…';preview.hidden=true;try{show(MDXImport.parse(await MDXImport.readFile(f)))}catch(e){console.warn('mdx import',e);status.textContent='That file could not be read ('+(e?.message||e||'unknown error')+'). Try “Paste text instead”: open My Plans, select all, copy, and paste it here.'}};
$c('#mdxRead').onclick=()=>{const t=$c('#mdxText').value;if(!t.trim()){status.textContent='Paste the text of your My Plans page first.';return}show(MDXImport.parse(t))};
const fmt=d=>d?new Date(d+'T00:00:00Z').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}):'';
const t12=t=>t?new Date(2000,0,1,+t.slice(0,2),+t.slice(3)).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'';
async function parkList(){if(!parksForDest(WDW).length){try{await loadDestinations()}catch{}}return parksForDest(WDW)}
function overlapping(r){return state.trips.filter(t=>t.destId===WDW&&t.date<=r.hotel.departure&&(t.endDate||t.date)>=r.hotel.arrival)}
let result=null;
function show(r){result=r;preview.replaceChildren();if(!r.found||!r.hotel?.arrival||!r.hotel?.departure){status.textContent='No trip was found in that. Make sure it is the My Plans page from disneyworld.com, with your reservations showing.';preview.hidden=true;return}
 status.textContent='';const parkDays=Object.keys(r.days).length,dining=r.reservations.filter(x=>x.kind==='Dining').length,other=r.reservations.length-dining;
 preview.append(h('b',null,`${r.hotel.name||'Your stay'} · ${fmt(r.hotel.arrival)} – ${fmt(r.hotel.departure)}`),h('p','muted',[r.partySize?r.partySize+' guests':'',r.hotel.checkIn?'check-in '+t12(r.hotel.checkIn):'',`${parkDays} park day${parkDays===1?'':'s'}`,`${dining} dining reservation${dining===1?'':'s'}`,other?`${other} other plan${other===1?'':'s'}`:''].filter(Boolean).join(' · ')));
 const ul=h('ul');for(const d of [...new Set([...Object.keys(r.days),...r.reservations.map(x=>x.date)])].filter(Boolean).sort()){const li=h('li');li.append(h('b',null,fmt(d)+(r.days[d]?' · '+r.days[d].join(' + '):'')));for(const x of r.reservations.filter(x=>x.date===d))li.append(h('div','muted',`${t12(x.time)} ${x.title}`));ul.append(li)}preview.append(ul);
 for(const w of r.warnings)preview.append(h('p','muted',w));
 const ov=overlapping(r),sel=h('select');sel.id='mdxTarget';for(const t of ov){const o=h('option',null,'Update “'+t.name+'”');o.value=t.id;sel.append(o)}const o=h('option',null,'Add as a new trip');o.value='';sel.append(o);
 if(ov.length){const lab=h('label',null,'Put it in');lab.htmlFor='mdxTarget';preview.append(lab,sel)}
 const go=h('button','primary',ov.length?'Import':'Add this trip');go.type='button';go.onclick=()=>apply(r,ov.length?sel.value:'').catch(e=>{status.textContent='Import did not finish: '+(e?.message||'try again')+'.'});const cancel=h('button',null,'Cancel');cancel.type='button';cancel.onclick=()=>{preview.hidden=true;result=null};const row=h('div','mdx-row');row.append(go,cancel);preview.append(row);preview.hidden=false;preview.scrollIntoView({behavior:'smooth',block:'nearest'})}
async function apply(r,targetId){const A=window.parkAccount,plus=!!(A&&A.plus());let t=targetId&&state.trips.find(x=>x.id===targetId);
 if(!t&&!plus&&upcomingTrips().length>=1){if(A)A.upgrade('Free accounts keep one upcoming trip. Choose “Update” to import into your current trip, or turn on Plus for more trips.');else status.textContent='Free accounts keep one upcoming trip. Choose “Update” to import into it.';return}
 const parks=await parkList(),dest=RESORTS.find(x=>x.id===WDW),missed=[];
 if(!t){t={id:crypto.randomUUID?.()||String(Date.now()),name:(r.hotel.name?r.hotel.name.replace(/^Disney'?s\s+/i,'')+' trip':'Disney World trip').slice(0,80),days:{}};state.trips.push(t)}
 Object.assign(t,{date:r.hotel.arrival,endDate:r.hotel.departure,time:r.hotel.checkIn||t.time||'15:00',destId:WDW,destName:dest?.name||'Walt Disney World (Florida)',tz:dest?.tz||'America/New_York'});
 t.days=Object.fromEntries(Object.entries(t.days||{}).filter(([d])=>d>=t.date&&d<=t.endDate));state.parks=state.parks||{};
 for(const [d,names] of Object.entries(r.days)){if(d<t.date||d>t.endDate)continue;const ids=[];for(const n of names){const p=MDXImport.matchPark(n,parks);if(p){ids.push(p.id);if(!state.parks[p.id])state.parks[p.id]={name:p.name,destName:dest?.name||'Walt Disney World'}}else missed.push(n)}if(ids.length)t.days[d]={...(t.days[d]||{}),parks:[...new Set(ids)]}}
 // dining and other reservations go into the trip's day plans; re-importing updates them instead of doubling up
 let added=0;try{const v=JSON.parse(localStorage.getItem(CKEY)||'{}');v.data=v.data&&typeof v.data==='object'?v.data:{};const d=v.data[t.id]=v.data[t.id]&&typeof v.data[t.id]==='object'?v.data[t.id]:{};const plans=Array.isArray(d.plans)?d.plans:[];
  for(const x of r.reservations){const note=[x.confirmation&&'Confirmation '+x.confirmation,x.guests&&x.guests+' guests',x.area].filter(Boolean).join(' · ');const key=x.confirmation?p=>String(p.note||'').includes('Confirmation '+x.confirmation):p=>p.date===x.date&&p.time===x.time&&p.name===x.title;const row={date:x.date,time:x.time,name:x.title.slice(0,120),kind:x.kind==='Dining'?'Dining':'Activity',park:x.park||'',note:note.slice(0,300),done:false};const old=plans.find(key);if(old)Object.assign(old,row);else{plans.push({id:crypto.randomUUID?.()||String(Date.now()+added),...row});added++}}
  d.plans=plans;localStorage.setItem(CKEY,JSON.stringify(v))}catch(e){console.warn('mdx plans',e)}
 state.homeTripId=t.id;homeDay=null;save();try{resetTripForm()}catch{}renderTrips();renderHero();renderHome();document.querySelectorAll('iframe.v27-frame').forEach(f=>{try{f.contentWindow.location.reload()}catch{}});
 preview.hidden=true;result=null;const parkDays=Object.keys(t.days).length;status.textContent=`Imported “${t.name}”: ${parkDays} park day${parkDays===1?'':'s'} and ${r.reservations.length} reservation${r.reservations.length===1?'':'s'}${added<r.reservations.length?' (updated ones you already had)':''}.${missed.length?' Could not match: '+[...new Set(missed)].join(', ')+'.':''}`;
 const b=h('button','primary','See it on Home');b.type='button';b.style.marginLeft='8px';b.onclick=()=>showTab('home');status.append(b)}
})();
