// Builds from the pinned original page and checks the patch is additive: original UI kept, two tags added, update checker replaced once.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const base=(fs.readFileSync(path.join(root,'build-integrated.sh'),'utf8').match(/BASE=([0-9a-f]{40})/)||[])[1];
cp.execFileSync('bash',['build-integrated.sh'],{cwd:root,stdio:'ignore'});
const out=fs.readFileSync(path.join(root,'dist','index.html'),'utf8');
assert.ok(base,'pinned base commit found');
assert.equal((out.match(/<link rel="manifest" href="manifest\.webmanifest">/g)||[]).length,1,'manifest link added once');
assert.equal((out.match(/<script src="integration\.js[^"]*"><\/script>/g)||[]).length,1,'integration script added once');
assert.match(out,/const BUILD = "v2-[0-9a-f]{20}";/,'build id set');
for(const id of ['hero','resCard','calCard','dayCard','ticker','map','packInput','tripForm']) assert.ok(out.includes(`id="${id}"`),'original element kept: '+id);
for(const fn of ['function renderHero','function renderCalendar','function renderDay','function openMapTab','function addPack','function renderTicker']) assert.ok(out.includes(fn),'original code kept: '+fn);
console.log('PASS: pinned original patched additively; original screens and code intact');
