/* Import from My Disney Experience.
   Reads the "My Plans, Reservations and Tickets" page, saved as a PDF from Disney's website or copied as text,
   and turns it into a trip: hotel and dates, a park for each day, dining and other reservations, and the party.
   Everything happens on the device: the file is never uploaded. */
(function(global){'use strict';
const MONTHS={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,sept:9,oct:10,nov:11,dec:12};
const DOW='(?:Mon|Tue|Tues|Wed|Thu|Thur|Thurs|Fri|Sat|Sun)[a-z]*';
const MON='(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\\.?';
const RE={
 day:new RegExp('^'+DOW+',?\\s+'+MON+'\\s+(\\d{1,2})(?:,\\s*(\\d{4}))?$','i'),
 range:new RegExp('^'+DOW+',?\\s+'+MON+'\\s+(\\d{1,2}),\\s*(\\d{4})\\s*[–—-]\\s*'+DOW+',?\\s+'+MON+'\\s+(\\d{1,2}),\\s*(\\d{4})$','i'),
 upcoming:/^Your upcoming reservation on ([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/i,
 time:/^(\d{1,2}):(\d{2})\s*([AP])\.?M\.?$/i,
 conf:/^Confirmation(?: Number| #)?:?\s*([A-Za-z0-9-]{3,40})$/i,
 guests:/^(\d{1,2})\s+Guests?$/i,
 staying:/^Staying at (.+)$/i,
 honorific:/^(?:Mr|Mrs|Ms|Miss|Mx|Dr)\.?\s+/i,
};
const NOISE=/^(Show Details|Hide Details|Change Reservation|Cancel Reservation|Modify Reservation|Start Check-?in|Hide Park Hours|Show Park Hours|Park Hours:?|Operating hours subject to change\.?|Add More Plans|Daily Itinerary|Help|Reservation:?)$/i;
const pad=n=>String(n).padStart(2,'0');
const iso=(y,m,d)=>`${y}-${pad(m)}-${pad(d)}`;
function validDate(s){const d=new Date(s+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s}
function to24(line){const m=String(line).trim().match(RE.time);if(!m)return '';let h=+m[1]%12;if(/p/i.test(m[3]))h+=12;return h<24&&+m[2]<60?pad(h)+':'+m[2]:''}
function clean(s){return String(s||'').replace(/[   ]/g,' ').replace(/[​-‍﻿]/g,'').replace(/[-]/g,'').replace(/\s+/g,' ').trim()}
function mealKind(title){return /\b(breakfast|brunch|lunch|dinner|dining|character meal|tea|dessert party|dine)\b/i.test(title)?'Dining':'Other'}

function parse(text){
 const lines=[];for(let raw of String(text||'').split(/\r?\n/)){let l=clean(raw);if(!l)continue;
  l=l.replace(/\b(Hide|Show) Park Hours\b/gi,'\n').replace(/\b(Show|Hide) Details\b/gi,'\n').replace(/\b(Change|Cancel|Modify) Reservation\b/gi,'\n')
   .replace(/(Park Hours:?)\s*/gi,'\n$1\n').replace(/(?:^|\s)(Reservation:)\s*/gi,'\n$1\n').replace(/\s*(Confirmation (?:Number|#):?)\s*/gi,'\n$1 ').replace(/\s+(\d{1,2} Guests?)\b/gi,'\n$1')
   .replace(/(Check[- ]?in after:?|Check[- ]?out before:?)\s*/gi,'\n$1\n').replace(/^(\s*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+[A-Z][a-z]{2,8}\.?\s+\d{1,2}(?:,\s*\d{4})?)(?!\s*[–—-])\s+(?=\S)/,'$1\n')
   .replace(/(\d{1,2}:\d{2}\s*[AP]\.?M\.?)\s+(?=[A-Z])/gi,'$1\n');
  for(const part of l.split('\n')){const c=clean(part);if(c)lines.push(c)}}
 for(let i=0;i<lines.length;i++){const m=lines[i].match(/^Confirmation (?:Number|#):?$/i);if(m&&lines[i+1]&&/^[A-Za-z0-9-]{3,40}$/.test(lines[i+1])){lines[i]='Confirmation Number: '+lines[i+1];lines.splice(i+1,1)}}
 const out={hotel:null,days:{},reservations:[],party:[],warnings:[]};
 let baseYear=0,baseMonth=0,current='';
 // Find the year first: the hotel's date range, else the "upcoming reservation" line.
 for(const l of lines){const r=l.match(RE.range);if(r){baseYear=+r[3];baseMonth=MONTHS[r[1].toLowerCase()];break}}
 if(!baseYear)for(const l of lines){const u=l.match(RE.upcoming);if(u&&MONTHS[u[1].slice(0,3).toLowerCase()]){baseYear=+u[3];baseMonth=MONTHS[u[1].slice(0,3).toLowerCase()];break}}
 if(!baseYear){const now=new Date();baseYear=now.getFullYear();baseMonth=now.getMonth()+1;out.warnings.push('No year was found, so the dates assume the next time they come round.')}
 const dayDate=(mon,d,y)=>{const m=MONTHS[mon.toLowerCase()];let year=y?+y:baseYear;if(!y&&m<baseMonth-6)year++;if(!y&&m>baseMonth+6)year--;const s=iso(year,m,+d);return validDate(s)?s:''};
 const hotelTimes={in:'',out:''};
 for(let i=0;i<lines.length;i++){
  const l=lines[i];
  // Day headers
  const dm=l.match(RE.day);if(dm){const s=dayDate(dm[1],dm[2],dm[3]);if(s){current=s;continue}}
  // Hotel stay
  const rm=l.match(RE.range);
  if(rm){const a=dayDate(rm[1],rm[2],rm[3]),b=dayDate(rm[4],rm[5],rm[6]);let name='';for(let k=i-1,seen=0;k>=0&&seen<4;k--){const p=lines[k];if(NOISE.test(p)||RE.time.test(p)||/^(Check|in after:?|out before:?)$/i.test(p))continue;seen++;if(/\bArea$/i.test(p)&&seen===1)continue;name=p;break}
   let conf='',guests=0;for(let k=i+1;k<Math.min(lines.length,i+5);k++){const c=lines[k].match(RE.conf);if(c)conf=c[1];const g=lines[k].match(RE.guests);if(g)guests=+g[1]}
   if(!out.hotel)out.hotel={name,arrival:a,departure:b,confirmation:conf,guests,checkIn:'',checkOut:''};continue}
  // Check-in / check-out times (the words can come before or after the time)
  if(/in after:?$/i.test(l)||/^check[- ]?in after/i.test(l)){for(let k=i-2;k<=i+3;k++){const t=to24(lines[k]||'');if(t){hotelTimes.in=t;break}}continue}
  if(/out before:?$/i.test(l)||/^check[- ]?out before/i.test(l)){for(let k=i-2;k<=i+3;k++){const t=to24(lines[k]||'');if(t){hotelTimes.out=t;break}}continue}
  // Parks: the line before "Park Hours:"
  if(/^Park Hours:?$/i.test(l)&&current){for(let k=i-1;k>=Math.max(0,i-3);k--){const p=lines[k];if(NOISE.test(p))continue;if(!RE.day.test(p)&&p.length<=80){const list=out.days[current]=out.days[current]||[];if(!list.includes(p))list.push(p)}break}continue}
  // Reservations (dining, events, activities)
  if(/^Reservation:?$/i.test(l)){let k=i+1,time='';while(k<lines.length&&k<i+3){const t=to24(lines[k]);if(t){time=t;k++;break}k++}
   const block=[];let conf='',guests=0;for(;k<lines.length&&k<i+14;k++){const p=lines[k];const c=p.match(RE.conf);if(c){conf=c[1];const g=(lines[k+1]||'').match(RE.guests);if(g)guests=+g[1];break}if(RE.day.test(p)||/^Reservation:?$/i.test(p))break;if(NOISE.test(p))continue;block.push(p)}
   if(!block.length)continue;const title=block[0],place=block.length>=4?block[block.length-1]:block.length>1?block[block.length-1]:title,park=block.length>=4?block[1]:'',area=block.length>=4?block[2]:'';
   out.reservations.push({date:current,time,title,place,park,area,confirmation:conf,guests,kind:mealKind(title)});continue}
 }
 // Party: names between "My Planning Party" and the help line
 const start=lines.findIndex(l=>/^My Planning Party$/i.test(l));
 if(start>=0)for(let i=start+1;i<lines.length&&i<start+60;i++){const l=lines[i];if(/^If anyone|^My Plans, Reservations|^Daily Itinerary|^Guests under/i.test(l))break;if(/^Reservations Shared/i.test(l)||/^Me$/i.test(l)||/^Age\b/i.test(l))continue;if(RE.honorific.test(l)||/^[A-Z][a-z'’-]+(?: [A-Z][A-Za-z.'’-]*){1,4}$/.test(l)){const next=lines[i+1]||'';out.party.push({name:l.replace(RE.honorific,'').slice(0,80),me:/^Me$/i.test(next),age:(next.match(/^Age (.+)$/i)||[])[1]||''})}}
 if(out.hotel){out.hotel.checkIn=hotelTimes.in;out.hotel.checkOut=hotelTimes.out}
 else{const s=lines.map(l=>l.match(RE.staying)).find(Boolean);const dates=Object.keys(out.days).concat(out.reservations.map(r=>r.date)).filter(Boolean).sort();if(s||dates.length)out.hotel={name:s?s[1]:'',arrival:dates[0]||'',departure:dates[dates.length-1]||'',confirmation:'',guests:0,checkIn:hotelTimes.in,checkOut:hotelTimes.out};if(!out.hotel?.arrival)out.warnings.push('No trip dates were found.')}
 out.partySize=out.hotel?.guests||out.party.length||Math.max(0,...out.reservations.map(r=>r.guests||0));
 out.found=!!(out.hotel?.arrival||Object.keys(out.days).length||out.reservations.length);
 return out}

// Turn PDF text items (from pdf.js) into lines, top to bottom.
function linesFromItems(items){
 const its=items.filter(it=>typeof it.str==='string'&&it.str.trim()).map(it=>({s:it.str,x:it.transform?.[4]||0,y:it.transform?.[5]||0,w:it.width||0,h:Math.abs(it.transform?.[3]||it.height||10)}));
 its.sort((a,b)=>(b.y-a.y)||(a.x-b.x));const rows=[];
 for(const it of its){const r=rows[rows.length-1];if(r&&Math.abs(r.y-it.y)<=Math.max(2,it.h*0.3))r.items.push(it);else rows.push({y:it.y,items:[it]})}
 const out=[];for(const r of rows){r.items.sort((a,b)=>a.x-b.x);let line='',end=null;for(const it of r.items){const gap=end==null?0:it.x-end;if(end!=null&&gap>Math.max(18,it.h*1.6)){out.push(line);line=''}else if(line&&gap>it.h*0.15&&!/\s$/.test(line))line+=' ';line+=it.s;end=it.x+it.w}out.push(line)}
 return out.join('\n')}

let pdfLib=null;
async function pdfText(file){if(!pdfLib){pdfLib=await import(new URL('vendor/pdfjs/pdf.min.js',document.baseURI).href);pdfLib.GlobalWorkerOptions.workerSrc=new URL('vendor/pdfjs/pdf.worker.min.js',document.baseURI).href}
 const data=new Uint8Array(await file.arrayBuffer());const task=pdfLib.getDocument({data,isEvalSupported:false,enableXfa:false}),doc=await task.promise;try{if(doc.numPages>40)throw Error('That PDF is too long to be a My Plans page.');const pages=[];for(let p=1;p<=doc.numPages;p++){const page=await doc.getPage(p);pages.push(linesFromItems((await page.getTextContent()).items))}return pages.join('\n')}finally{try{await task.destroy()}catch{}}}
async function readFile(file){if(!file)throw Error('Choose a file first.');if(file.size>25*1024*1024)throw Error('That file is too large.');const isPdf=/pdf$/i.test(file.type)||/\.pdf$/i.test(file.name||'');return isPdf?pdfText(file):file.text()}

// Match Disney's park names to the app's park list ("Disney's Animal Kingdom" -> "Disney's Animal Kingdom Theme Park").
const norm=s=>clean(s).toLowerCase().replace(/[’']/g,"'").replace(/®|™/g,'').replace(/^disney'?s\s+/,'').replace(/\b(theme park|water park|park)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
function matchPark(name,parks){const n=norm(name);if(!n)return null;return parks.find(p=>norm(p.name)===n)||parks.find(p=>{const q=norm(p.name);return q&&(q.startsWith(n)||n.startsWith(q))})||null}

global.MDXImport={parse,linesFromItems,readFile,matchPark,to24};
})(typeof window!=='undefined'?window:globalThis);
