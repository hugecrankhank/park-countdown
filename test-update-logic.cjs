const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm'), os=require('node:os'), path=require('node:path'), cp=require('node:child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'park-update-'));
const src=fs.readFileSync(path.join(__dirname,'test-auto-update.py'),'utf8');
const block=src.slice(src.indexOf('const BUILD ='),src.indexOf('</script></body></html>'));
const html='<html><head></head><body>'+['hero','resCard','calCard','dayCard','ticker','map','packInput','tripForm'].map(id=>`<div id="${id}"></div>`).join('')+'<script>function showTab(t){};const KEY = "parkCountdown.v1";\n'+block+'</script></body></html>';
function build(change=''){
 fs.writeFileSync(path.join(dir,'index.html'),html);
 fs.writeFileSync(path.join(dir,'integration.js'),'// fixture'+change);
 fs.writeFileSync(path.join(dir,'companion.html'),'<script src="companion.js"></script>');
 fs.writeFileSync(path.join(dir,'companion.js'),'// companion');
 fs.copyFileSync(path.join(__dirname,'sw-integrated.js'),path.join(dir,'sw.js'));
 cp.execFileSync(process.execPath,[path.join(__dirname,'patch-original.cjs'),path.join(dir,'index.html')]);
 const v=fs.readFileSync(path.join(dir,'version.txt'),'utf8').trim();
 assert.match(v,/^v2-[a-f0-9]{20}$/);assert(fs.readFileSync(path.join(dir,'sw.js'),'utf8').includes('park-day-integrated-'+v));
 return v;
}
(async()=>{
 const v1=build();assert.equal(build(),v1);const old=fs.readFileSync(path.join(dir,'index.html'),'utf8');const v2=build('change');assert.notEqual(v1,v2);
 let latest=v1, banner=null, replaced=null, timer, callbacks={}, offline=false;
 const ctx=vm.createContext({URL,Date,fetch:async(url,opts)=>{assert.equal(opts.cache,'no-store');if(offline)throw Error('offline');return {ok:true,text:async()=>latest}},document:{hidden:false,querySelector:()=>banner,createElement:()=>({remove(){banner=null}}),body:{appendChild(b){banner=b}},addEventListener:(n,f)=>callbacks[n]=f},window:{addEventListener:(n,f)=>callbacks[n]=f},location:{href:'https://example.com/?keep=yes#home',replace:u=>replaced=u},setInterval:(f,n)=>{assert.equal(n,60000);timer=f}});
 vm.runInContext(old.slice(old.indexOf('const BUILD ='),old.indexOf('</script>')),ctx);
 const tick=()=>new Promise(r=>setImmediate(r));await tick();assert.equal(banner,null);
 latest=v2;timer();await tick();assert.equal(banner.textContent,'Update ready · tap to refresh');const b=banner;callbacks.pageshow();await tick();assert.equal(banner,b);banner.onclick();assert.equal(replaced,`https://example.com/?keep=yes&v=${v2}#home`);
 latest=v1;callbacks.visibilitychange();await tick();assert.equal(banner,null);
 offline=true;callbacks.online();await tick();assert.equal(banner,null);
 offline=false;latest='<html>error</html>';timer();await tick();assert.equal(banner,null);
 assert(!fs.readFileSync(path.join(dir,'sw.js'),'utf8').includes('__BUILD_VERSION__'));
 console.log('PASS: deterministic version, code changes change version, cache version matches, foreground detection, single update banner, refresh URL preserves parameters, rollback hides banner, offline and invalid responses ignored');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>fs.rmSync(dir,{recursive:true,force:true}));
