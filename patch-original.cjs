const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const file = path.resolve(process.argv[2]);
const dir = path.dirname(file);
let html = fs.readFileSync(file, 'utf8');
for (const marker of ['id="hero"','id="resCard"','id="calCard"','id="dayCard"','id="ticker"','id="map"','id="packInput"','id="tripForm"','function showTab(t)','const KEY = "parkCountdown.v1"','</body>','</head>']) {
  if (!html.includes(marker)) throw Error('Original release missing '+marker);
}
// Derive a stable version from the deployed application, not the original branch's date.
const hash = crypto.createHash('sha256');
hash.update(fs.readFileSync(__filename));
for (const name of fs.readdirSync(dir).sort()) {
  if (['version.txt','_headers'].includes(name) || !fs.statSync(path.join(dir,name)).isFile()) continue;
  hash.update('\0'+name+'\0'); hash.update(fs.readFileSync(path.join(dir,name)));
}
const build = 'v2-'+hash.digest('hex').slice(0,20);
const oldUpdates = /const BUILD = "[^"\r\n]+";\s*async function checkForUpdate\(\)\s*\{[\s\S]*?\ncheckForUpdate\(\);\s*document\.addEventListener\("visibilitychange", \(\) => \{ if \(!document\.hidden\) checkForUpdate\(\); \}\);/g;
if ([...html.matchAll(oldUpdates)].length!==1) throw Error('Expected exactly one original update checker');
const updateCode = `const BUILD = ${JSON.stringify(build)};
let updateChecking = false;
async function checkForUpdate(){
  if(updateChecking) return;
  updateChecking = true;
  try {
    const r = await fetch("version.txt?t=" + Date.now(), {cache:"no-store"});
    if (!r.ok) return;
    const latest = (await r.text()).trim();
    if (!/^(?:v2-[a-f0-9]{20}|[0-9]{12})$/.test(latest)) return;
    let b = document.querySelector(".update-bar");
    if (latest === BUILD) { if(b) b.remove(); return; }
    if (!b) {
      b = document.createElement("button");
      b.type = "button";
      b.className = "primary update-bar";
      b.textContent = "Update ready · tap to refresh";
      document.body.appendChild(b);
    }
    b.onclick = () => {
      const url = new URL(location.href);
      url.searchParams.set("v", latest);
      location.replace(url.href);
    };
  } catch(e) {} finally { updateChecking = false; }
}
checkForUpdate();
document.addEventListener("visibilitychange", () => { if (!document.hidden) checkForUpdate(); });
window.addEventListener("pageshow", () => checkForUpdate());
window.addEventListener("online", () => checkForUpdate());
setInterval(() => { if (!document.hidden) checkForUpdate(); }, 60000);`;
html=html.replace(oldUpdates,()=>updateCode);
if(!html.includes('rel="manifest"')) html=html.replace('</head>','<link rel="manifest" href="manifest.webmanifest">\n</head>');
html=html.replace('</head>',`<link rel="stylesheet" href="account.css?v=${build}">\n</head>`);
html=html.replace('</body>',`<script src="mdx-import.js?v=${build}"></script>\n<script src="integration.js?v=${build}"></script>\n<script src="account-config.js?v=${build}"></script>\n<script src="qr-local.js?v=${build}"></script>\n<script src="account.js?v=${build}"></script>\n</body>`);
const swFile=path.join(dir,'sw.js');
const sw=fs.readFileSync(swFile,'utf8');
if(!sw.includes('__BUILD_VERSION__')) throw Error('Service worker version marker missing');
const companionFile=path.join(dir,'companion.html');
const companion=fs.readFileSync(companionFile,'utf8');
if (!companion.includes('src="companion.js"')) throw Error('Companion script marker missing');
fs.writeFileSync(file,html);
fs.writeFileSync(companionFile,companion.replace('src="companion.js"',`src="companion.js?v=${build}"`));
fs.writeFileSync(swFile,sw.replaceAll('__BUILD_VERSION__',build));
fs.writeFileSync(path.join(dir,'version.txt'),build+'\n');
// Cloudflare Pages: ensure app shell and release check are revalidated, not pinned by HTTP cache.
fs.writeFileSync(path.join(dir,'_headers'),['/','/index.html','/version.txt','/sw.js','/integration.js','/companion.html','/companion.js','/manifest.webmanifest','/account.css','/account.js','/account-config.js','/qr-local.js','/mdx-import.js'].map(p=>p+'\n  Cache-Control: no-cache, must-revalidate\n').join('')+'/vendor/pdfjs/*.js\n  Content-Type: text/javascript; charset=utf-8\n  Cache-Control: public, max-age=86400\n');
console.log('Generated update version: '+build);
