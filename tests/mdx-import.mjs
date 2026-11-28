// Unit test for the My Disney Experience import (no network). Fixtures are made-up data.
import fs from 'node:fs';import assert from 'node:assert';import path from 'node:path';import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
await import(path.join(here,'..','mdx-import.js'));
const {parse,matchPark,to24}=globalThis.MDXImport;
const r=parse(fs.readFileSync(path.join(here,'fixtures','myplans-sample.txt'),'utf8'));
assert.deepEqual(r.hotel,{name:"Disney's Contemporary Resort",arrival:'2027-01-27',departure:'2027-02-01',confirmation:'91000000',guests:2,checkIn:'15:00',checkOut:'11:00'});
assert.deepEqual(r.days,{'2027-01-28':['Magic Kingdom Park'],'2027-01-29':['EPCOT'],'2027-01-30':["Disney's Hollywood Studios"],'2027-01-31':['Magic Kingdom Park']});
assert.equal(r.reservations.length,5);
assert.deepEqual(r.reservations.map(x=>[x.date,x.time,x.kind]),[['2027-01-28','17:40','Dining'],['2027-01-29','17:30','Dining'],['2027-01-30','11:30','Dining'],['2027-01-30','17:00','Dining'],['2027-01-31','17:15','Dining']]);
assert.equal(r.reservations[0].place,'Be Our Guest Restaurant');assert.equal(r.reservations[1].guests,3);assert.ok(/^9\d+$/.test(r.reservations[0].confirmation));
assert.deepEqual(r.party.map(p=>[p.name,p.me,p.age]),[['Alex Q Sample',true,''],['Jordan Q Sample',false,'18+']]);
assert.equal(r.partySize,2);
// across the new year: no year on the day headers
const y=parse("Sat, Dec 30\nMagic Kingdom Park\nPark Hours:\nMon, Jan 1\nEPCOT\nPark Hours:\nYour upcoming reservation on December 30, 2026");
assert.deepEqual(Object.keys(y.days),['2026-12-30','2027-01-01']);
assert.equal(parse('hello world').found,false);
const parks=[{id:'ak',name:"Disney's Animal Kingdom Theme Park"},{id:'mk',name:'Magic Kingdom Park'},{id:'ep',name:'EPCOT'}];
assert.equal(matchPark("Disney's Animal Kingdom",parks).id,'ak');assert.equal(matchPark('Magic Kingdom',parks).id,'mk');assert.equal(matchPark('Typhoon Lagoon',parks),null);
assert.equal(to24('12:05 AM'),'00:05');assert.equal(to24('12:30 PM'),'12:30');
// the same answer from the PDF, read with pdf.js the way the app does
const pdfjsPath='/opt/npm-tools/node_modules/pdfjs-dist/legacy/build/pdf.mjs';
if(fs.existsSync(pdfjsPath)){const pdfjs=await import(pdfjsPath);const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(path.join(here,'fixtures','myplans-sample.pdf'))),isEvalSupported:false}).promise;let t='';for(let p=1;p<=doc.numPages;p++)t+=globalThis.MDXImport.linesFromItems((await (await doc.getPage(p)).getTextContent()).items)+'\n';const q=parse(t);assert.deepEqual(q.days,r.days);assert.deepEqual(q.hotel,r.hotel);assert.equal(q.reservations.length,5)}
console.log('PASS: My Disney Experience import parsing');
