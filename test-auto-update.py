from pathlib import Path
import tempfile, subprocess, shutil, re, threading, functools
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parent
# Fixture uses the exact original update block and expected build markers.
original='''<!doctype html><html><head></head><body>'''+''.join(f'<div id="{x}"></div>' for x in ['hero','resCard','calCard','dayCard','ticker','map','packInput','tripForm'])+'''<script>
function showTab(t){};const KEY = "parkCountdown.v1";
const BUILD = "202611250243";
async function checkForUpdate(){
  try {
    const r = await fetch("version.txt?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) return;
    const latest = (await r.text()).trim();
    if (latest && latest !== BUILD && !document.querySelector(".update-bar")){
      const b = document.createElement("button");
      b.className = "primary update-bar"; b.textContent = "Update ready · tap to refresh";
      b.onclick = () => location.replace(location.pathname + "?v=" + encodeURIComponent(latest) + location.hash);
      document.body.appendChild(b);
    }
  } catch(e){}
}
checkForUpdate();
document.addEventListener("visibilitychange", () => { if (!document.hidden) checkForUpdate(); });
</script></body></html>'''
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
with tempfile.TemporaryDirectory() as tmp:
    d=Path(tmp)
    def build(change=''):
        (d/'index.html').write_text(original)
        (d/'integration.js').write_text("navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});"+change)
        (d/'companion.html').write_text('<html><script type="module" src="companion.js"></script></html>')
        (d/'companion.js').write_text('export const ok=true;')
        for n in ['icon-192.png','icon-512.png','manifest.webmanifest']:(d/n).write_text('fixture')
        shutil.copy(root/'sw-integrated.js',d/'sw.js')
        subprocess.run(['node',str(root/'patch-original.cjs'),str(d/'index.html')],check=True)
        v=(d/'version.txt').read_text().strip()
        assert re.fullmatch('v2-[a-f0-9]{20}',v)
        assert f'const BUILD = "{v}"' in (d/'index.html').read_text()
        assert f'park-day-integrated-{v}' in (d/'sw.js').read_text()
        assert f'companion.js?v={v}' in (d/'companion.html').read_text()
        return v
    v1=build();assert build()==v1
    server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=tmp));threading.Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://127.0.0.1:{server.server_port}/'
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'],headless=True)
            p=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
            p.goto(url+'?keep=yes#home');p.evaluate('navigator.serviceWorker.ready');p.wait_for_function('navigator.serviceWorker.controller !== null')
            p.evaluate('checkForUpdate()');assert p.locator('.update-bar').count()==0
            p.evaluate('localStorage.setItem("trip-test","saved");new Promise((resolve,reject)=>{let q=indexedDB.open("art-test",1);q.onupgradeneeded=()=>q.result.createObjectStore("images");q.onsuccess=()=>{let tx=q.result.transaction("images","readwrite");tx.objectStore("images").put("saved-art","one");tx.oncomplete=resolve;tx.onerror=reject;};})')
            v2=build('// updated');assert v2!=v1
            p.evaluate('checkForUpdate()');p.locator('.update-bar').wait_for();assert p.locator('.update-bar').count()==1
            p.locator('.update-bar').click();p.wait_for_url(f'**v={v2}#home')
            assert p.evaluate('BUILD')==v2 and p.evaluate('localStorage.getItem("trip-test")')=='saved'
            assert p.evaluate('new Promise(resolve=>{let q=indexedDB.open("art-test",1);q.onsuccess=()=>{let r=q.result.transaction("images").objectStore("images").get("one");r.onsuccess=()=>resolve(r.result);};})')=='saved-art'
            assert 'keep=yes' in p.url and p.locator('.update-bar').count()==0
            p.evaluate('navigator.serviceWorker.getRegistration().then(r=>r.update())');p.wait_for_function(f'caches.keys().then(k=>k.includes("park-day-integrated-{v2}"))')
            p.context.set_offline(True);p.reload();assert p.evaluate('BUILD')==v2;assert p.locator('.update-bar').count()==0
            browser.close()
    finally:server.shutdown();server.server_close()
print('PASS: stable build hash, changed release detection, tap-to-refresh, preserved URL and storage, new worker cache, offline reload')
