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
function send(){if(ready)frame.contentWindow.postMessage({kind:'park-open',tab:currentRoute,tripId:currentTrip,day:currentDay},origin)}
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
  "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Disney%27s_Polynesian_Village_Resort_%2818315110939%29.jpg/960px-Disney%27s_Polynesian_Village_Resort_%2818315110939%29.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/b/b7/Disney%27s_Polynesian_Village_Resort_%2818315110939%29.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:Disney%27s_Polynesian_Village_Resort_%2818315110939%29.jpg",
  "author": "Sam Howzit",
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
  "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Disney%27s-Grand-Floridian-Resort.jpg/960px-Disney%27s-Grand-Floridian-Resort.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/6/62/Disney%27s-Grand-Floridian-Resort.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:Disney%27s-Grand-Floridian-Resort.jpg",
  "author": "Micha L. Rieser",
  "license": "Attribution only",
  "licenseURL": "https://commons.wikimedia.org/wiki/File:Disney%27s-Grand-Floridian-Resort.jpg",
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
  "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Disney%27s-Wilderness-Lodge-Entrance.jpg/960px-Disney%27s-Wilderness-Lodge-Entrance.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/f/f4/Disney%27s-Wilderness-Lodge-Entrance.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:Disney%27s-Wilderness-Lodge-Entrance.jpg",
  "author": "Micha L. Rieser",
  "license": "Attribution only",
  "licenseURL": "https://commons.wikimedia.org/wiki/File:Disney%27s-Wilderness-Lodge-Entrance.jpg",
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
  "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Disney%27s-Pop-Century-Resort-Entrance.jpg/960px-Disney%27s-Pop-Century-Resort-Entrance.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/8/8a/Disney%27s-Pop-Century-Resort-Entrance.jpg",
  "source": "https://commons.wikimedia.org/wiki/File:Disney%27s-Pop-Century-Resort-Entrance.jpg",
  "author": "Micha L. Rieser",
  "license": "Attribution only",
  "licenseURL": "https://commons.wikimedia.org/wiki/File:Disney%27s-Pop-Century-Resort-Entrance.jpg",
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
 }
];
const galleryKey='parkCountdown.v2.homeGallery';
let homeGallery=Object.assign({mode:'all',paused:false},get(galleryKey,{})),lastSlideKey='',lastSelection='',failedPhotos=new Set();
function storeHomeGallery(){try{localStorage.setItem(galleryKey,JSON.stringify(homeGallery))}catch(e){}}
const safePersonalPhoto=x=>typeof x==='string'&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(x);
function selectResortPhotos(v,selected,mode,period){
 const personal=[];
 const names=new Set([...Object.keys(v.gallery||{}),...Object.keys(v.images||{})]);
 for(const resort of names){let list=Array.isArray(v.gallery?.[resort])?v.gallery[resort].filter(p=>safePersonalPhoto(p?.src)):[];if(!list.length&&safePersonalPhoto(v.images?.[resort]))list=[{src:v.images[resort],kind:'any'}];
  for(const p of list)personal.push({resort,src:p.src,kind:p.kind||'any',personal:true});}
 const all=[...personal,...resortPhotos];
 let chosen=mode==='selected'&&selected?all.filter(p=>p.resort===selected):all;
 if(mode==='selected'&&selected){let preferred=chosen.filter(p=>p.kind===period||p.kind==='any');if(preferred.length>=2)chosen=preferred;}
 if(!chosen.length)chosen=all;
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
 if(slide){const img=make('img');img.alt=slide.resort;img.decoding='async';img.referrerPolicy='no-referrer';let retried=false;img.onerror=()=>{if(!img.isConnected)return;if(!retried&&slide.original&&slide.original!==slide.src){retried=true;img.src=slide.original;return}failedPhotos.add(slide.src);lastSlideKey='';renderResortGallery(t,v,d,summaryDay)};img.src=slide.src;visual.append(img);}
 else visual.append(make('p','Resort pictures could not load. Check your connection or upload personal photos in Resort settings.','muted'));
 const caption=make('div','','v27-resort-caption');caption.append(make('h2',slide?.resort||'Resort gallery'));galleryCard.append(caption);
 if(slide?.personal)caption.append(make('small','Your personal photo','muted'));
 else if(slide){const credit=make('small','','muted');credit.append(document.createTextNode('Photo: '));const source=make('a',slide.author);source.href=slide.source;source.target='_blank';source.rel='noopener noreferrer';const lic=make('a',slide.license);lic.href=slide.licenseURL;lic.target='_blank';lic.rel='noopener noreferrer';credit.append(source,document.createTextNode(' · '),lic,document.createTextNode(' · Display cropped to fit'));caption.append(credit)}
 const row=make('div','','v27-links');const rerender=()=>{lastSlideKey='';renderResortGallery(t,v,d,summaryDay)};
 const prev=button('‹',()=>{photoIndex--;rerender()});prev.setAttribute('aria-label','Previous resort photo');prev.disabled=pics.length<2;
 const next=button('›',()=>{photoIndex++;rerender()});next.setAttribute('aria-label','Next resort photo');next.disabled=pics.length<2;
 const pause=button(homeGallery.paused||v.galleryPrefs?.rotation===false?'Play':'Pause',()=>{homeGallery.paused=!homeGallery.paused;if(v.galleryPrefs?.rotation===false){homeGallery.paused=false;alert('Automatic rotation is disabled in Resort gallery settings. Enable it there to resume.');}storeHomeGallery();rerender()});
 const modeBtn=button(homeGallery.mode==='selected'?'All resorts':'My resort',()=>{if(!selected&&homeGallery.mode==='all'){open('Explore',{tripId:t?.id});return}homeGallery.mode=homeGallery.mode==='selected'?'all':'selected';photoIndex=0;storeHomeGallery();rerender()});
 row.append(prev,next,pause,modeBtn,button('Resort details',()=>open('Explore',{tripId:t?.id})));galleryCard.append(row);
 if(homeGallery.mode==='selected'&&selected&&slide?.resort!==selected)galleryCard.append(make('small','No photos for your selected hotel yet. Showing the wider collection.','muted'));
}
function refreshHome(){
 const t=nextTrip(), v=get(V2,{}), d=t?v.data?.[t.id]:null;let summaryDay=typeof homeDay!=='undefined'&&homeDay;
 renderResortGallery(t,v,d,summaryDay);
 homeCard.replaceChildren();homeCard.append(make('h2',summaryDay?'Detailed day planner':'Vacation companion'));if(t){const now=todayIn(t.tz), mode=d?.mode&&d.mode!=='auto'?d.mode:now<t.date?'Countdown':now===t.date?'Travel':now<=(t.endDate||t.date)?'Vacation':'Memories';const checks=d?.checks||[],due=(d?.milestones||[]).filter(x=>!x.done&&x.date<=now),plans=(d?.plans||[]).filter(x=>!x.done&&x.date>=now).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));homeCard.append(make('p',`${mode} mode · ${checks.filter(x=>x.done).length}/${checks.length} preparation items · ${due.length} reminders due`,'muted'));if(plans[0])homeCard.append(make('p','Up next: '+plans[0].name+' · '+plans[0].date+' '+plans[0].time));if(due[0])homeCard.append(make('p','Reminder: '+due[0].name));}else homeCard.append(make('p','Create a trip in the original Trips tab or view previous memories.','muted'));let row=make('div','','v27-links');row.append(button(summaryDay?'Plan this day':'Detailed itinerary',()=>open('Trips',{day:summaryDay||''}),true),button('Resorts',()=>open('Explore')),button('Passport',()=>open('Passport')),button('Memories',()=>open('Memories')));homeCard.append(row);
}
window.addEventListener('message',ev=>{if(ev.origin!==origin||ev.source!==frame.contentWindow)return;const m=ev.data||{};if(m.kind==='park-ready'){ready=true;send()}else if(m.kind==='park-height'){frame.style.height=Math.min(50000,Math.max(450,Number(m.height)||450))+'px'}else if(m.kind==='park-saved'){refreshHome()}else if(m.kind==='park-route'){if(['Explore','Trips','Waits','Passport','Memories','Settings'].includes(m.tab))currentRoute=m.tab;if(typeof m.tripId==='string')currentTrip=m.tripId;}else if(m.kind==='park-original'){if(m.tab==='trips'||m.tab==='map'||m.tab==='pick'||m.tab==='home'){if(m.tab==='home'&&typeof m.day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(m.day)){let t=state.trips.find(x=>x.id===m.tripId);if(t&&tripDays(t).includes(m.day)&&tripEnd(t)>Date.now()){showTripOnHome(t.id);openDay(m.day);return}}showTab(m.tab);window.scrollTo({top:0,behavior:'auto'})}}else if(m.kind==='park-favorite'&&typeof m.parkId==='string'&&typeof m.rideId==='string'){let p=state.parks[m.parkId];if(!p){const dest=destinations.find(d=>d.parks?.some(x=>x.id===m.parkId)), known=dest?.parks.find(x=>x.id===m.parkId);if(!known)return;state.parks[m.parkId]={name:known.name,destName:dest.name}}let f=state.favs[m.parkId]||[];state.favs[m.parkId]=m.on?[...new Set([...f,m.rideId])]:f.filter(x=>x!==m.rideId);originalSave();refreshHome();renderTicker();}});
window.addEventListener('storage',e=>{if(e.key===V2)refreshHome()});setInterval(()=>{let v=get(V2,{});if(v.galleryPrefs?.rotation!==false&&!homeGallery.paused&&!document.hidden&&!galleryCard.hidden&&!document.querySelector('[data-panel="home"]').hidden){photoIndex++;refreshHome()}},15000);
const originalGetLive=getLive;getLive=async function(parkId,force){const rows=await originalGetLive(parkId,force);try{const observed=liveCache[parkId]?.at||Date.now(), key='parkCountdown.v2.originalLive', samples=get(key,{}), current=samples[parkId]||{at:0,history:{},statuses:{}};if(observed>current.at){current.at=observed;for(const r of rows){current.statuses[r.id]=r.status;const wait=r.queue?.STANDBY?.waitTime;if(r.status==='OPERATING'&&Number.isFinite(wait)){const h=current.history[r.id]||[];if(!h.length||observed-h[h.length-1].at>=60000)h.push({at:observed,w:wait});current.history[r.id]=h.slice(-72)}}samples[parkId]=current;localStorage.setItem(key,JSON.stringify(samples))}}catch(e){}return rows};
refreshHome();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
