from pathlib import Path
from playwright.sync_api import sync_playwright

# Fixture mirrors the original tab mechanism and original attraction card IDs.
source = Path(__file__).with_name('integration.js').read_text()
start = source.index('// Dedicated image library:')
end = source.index('const safePersonalPhoto=', start)
patch = source[start:end]
fixture = '''<!doctype html><html><body><div class="wrap"><div class="tabs"><button data-tab="home" class="on">Home</button><button data-tab="pick">Parks &amp; Rides</button><button data-tab="extras">More</button></div><section data-panel="home" id="home"><button id="homeShortcut">Picture packs</button></section><section data-panel="pick" hidden id="rides">Ride list</section><section class="card" data-panel="pick" hidden id="originalPack"><h2>Picture packs</h2><button id="packBtn">Upload pictures</button><button id="packClear">Remove pack pictures</button><div id="packStatus">145 pictures saved</div><input type="file" id="packInput" hidden></section><section data-panel="extras" hidden>More content</section><section class="card" id="resortPackCard" data-panel="pictures" hidden><h2>Resort picture packs</h2><button id="resortUpload">Upload resort pictures</button><p>84 images</p></section></div><script>
const make=(tag,txt,cls)=>{let x=document.createElement(tag);if(txt)x.textContent=txt;if(cls)x.className=cls;return x};
const nav=document.querySelector('.tabs'),extra=nav.querySelector('[data-tab="extras"]'),artCard=document.querySelector('#resortPackCard');
function renderPicker(){} function openMapTab(){} function renderWaits(){} function renderHome(){} function renderTicker(){} let homeDay=false;
function showTab(t){document.querySelectorAll(".tabs button").forEach(b=>b.classList.toggle("on",b.dataset.tab===t));document.querySelectorAll("[data-panel]").forEach(p=>p.hidden=p.dataset.panel!==t);if(t==="pick")renderPicker();if(t==="map")openMapTab();if(t==="waits")renderWaits();if(t==="home"){renderHome();if(!homeDay)renderTicker();}}
nav.querySelectorAll('button').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
window.oldInput=document.querySelector('#packInput');window.oldButton=document.querySelector('#packBtn');window.originalClicks=0;oldButton.onclick=()=>window.originalClicks++;
''' + patch + '''\ndocument.querySelector('#homeShortcut').onclick=openResortPacks;</script></body></html>'''
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'],headless=True)
    page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    page.set_content(fixture)
    page.locator('[data-tab="pictures"]').click()
    assert page.locator('[data-tab="pictures"]').evaluate("x=>x.classList.contains('on')")
    assert page.locator('#originalPack').is_visible() and page.locator('#resortPackCard').is_visible()
    assert not page.locator('#rides').is_visible() and not page.locator('#home').is_visible()
    assert page.locator('#packStatus').inner_text()=='145 pictures saved'
    assert page.evaluate('oldInput===document.querySelector("#packInput") && oldButton===document.querySelector("#packBtn")')
    page.locator('#packBtn').click(); assert page.evaluate('originalClicks')==1
    page.locator('[data-tab="pick"]').click(); assert page.locator('#rides').is_visible() and not page.locator('#originalPack').is_visible() and not page.locator('#resortPackCard').is_visible()
    page.locator('[data-tab="home"]').click();page.locator('#homeShortcut').click();assert page.locator('#resortPackCard').is_visible()
    page.locator('[data-tab="extras"]').click();assert not page.locator('#resortPackCard').is_visible()
    browser.close()
print('PASS: mobile-width Chromium fixture; tab routing, both upload cards, original input and handler identity, existing status and Home shortcut')
