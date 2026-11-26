# Browser test: free account is prompted to upgrade, beta Plus unlocks, picture backup/restore, shared-trip update (needs local server on 8765)
import asyncio, json, os, base64
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__));FAKE=open(os.path.join(HERE,'fake-supabase.js')).read()
MK='75ea578a-adc8-4116-a54d-dccb60765ef9'; WDW='e957da41-3552-4cf6-b636-5babc5cbc4e5'
PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
state={'trips':[{'id':'t1','name':'My Trip','date':'2027-01-27','endDate':'2027-01-29','time':'15:00','destId':WDW,'destName':'Walt Disney World (Florida)','tz':'America/New_York','days':{'2027-01-28':{'parks':[MK]}}}],'parks':{MK:{'name':'Magic Kingdom Park'}},'favs':{},'destId':WDW}
cloud={'id':'c1','owner_id':'u-f','title':'Shared Trip','arrival':'2027-03-01','departure':'2027-03-04','resort':'','destination':'Walt Disney World (Florida)','party_size':2,'status':'booked','notes':'','revision':2,'reservations':[]}
sb={'user':{'id':'u-f','email':'f@test.com'},'tables':{'account_trips':[cloud]},'rpc':{'my_tier':{'tier':'free','beta_open':True},'is_app_admin':False,
 'my_share_updates':[{'trip_id':'c1','sender':'Pat','title':'Shared Trip','note':'Added lunch!','updated_at':'2026-11-26T00:00:00Z'}],'apply_share_update':{'applied':True,'plan':None}}}
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome')
    ctx=await b.new_context(viewport={'width':390,'height':844},service_workers='block')
    pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
    async def route(r):
      u=r.request.url
      if 'supabase-js' in u: return await r.fulfill(body=FAKE,content_type='application/javascript')
      if 'account-config.js' in u: return await r.fulfill(body='window.PARK_ACCOUNTS={url:"https://x.supabase.co",key:"sb_publishable_x"};',content_type='application/javascript')
      if 'themeparks.wiki' in u: return await r.fulfill(body=json.dumps({'destinations':[],'liveData':[],'children':[]}),content_type='application/json')
      if u.startswith('http://localhost'): return await r.continue_()
      await r.abort()
    await pg.route('**/*',route)
    await pg.goto('http://localhost:8765/index.html')
    await pg.evaluate("([s,f])=>{localStorage.clear();localStorage.setItem('parkCountdown.v1',JSON.stringify(s));localStorage.setItem('fakesb',JSON.stringify(f));sessionStorage.setItem('parkCountdown.portal.entered','1')}",[state,sb])
    await pg.goto('about:blank');await pg.goto('http://localhost:8765/index.html');await pg.wait_for_timeout(2500)
    g=await pg.inner_text('#planGuide');print('free guide:',g.replace('\n',' | '));assert 'See Plus' in g and 'Next:' not in g
    print('banner:',await pg.inner_text('#pcUpdateBanner'))
    await pg.evaluate("renderWalkStats()");w=await pg.inner_text('#walkStats');print('free walking:',w.replace('\n',' | '));assert 'See Plus' in w
    await pg.evaluate("document.querySelector('#tripForm').onsubmit(new Event('submit',{cancelable:true}))");await pg.wait_for_timeout(400)
    v=await pg.evaluate("document.querySelector('#pcPortal').dataset.view+'|'+document.querySelector('#pcPortal').innerText.slice(0,200)");print('second trip:',v[:120].replace('\n',' | '));assert v.startswith('upgrade') and 'one upcoming trip' in v
    await pg.click('.pc-home-btn');await pg.wait_for_timeout(300)
    await pg.click('.pc-menu-btn');await pg.click('#pcMenu button[data-tab=predict]');await pg.wait_for_timeout(1200)
    st=await pg.inner_text('#spStatus');print('free predictions:',st);assert 'part of Plus' in st
    await pg.click('#spStatus button');await pg.wait_for_timeout(500)
    up=await pg.inner_text('#pcPortal');assert 'Park Day Plus' in up and 'free while the app is in beta' in up
    await pg.click('text=Turn on Plus');await pg.wait_for_timeout(800)
    assert 'You have Plus' in await pg.inner_text('#pcPortal')
    await pg.click('text=Back to the app');await pg.wait_for_timeout(600)
    g=await pg.inner_text('#planGuide');print('plus guide:',g[:60].replace('\n',' | '));assert 'Next:' in g
    # shared-trip update in My account
    await pg.click('.pc-account-btn');await pg.wait_for_timeout(1500)
    d=await pg.inner_text('#pcPortal');assert 'Plan: Plus' in d and 'Added lunch!' in d, d[:400]
    await pg.click('text=Apply update');await pg.wait_for_timeout(1000)
    calls=await pg.evaluate("JSON.parse(localStorage.getItem('fakesb')).calls.filter(c=>c.name==='apply_share_update').map(c=>c.args)");print('apply:',calls);assert calls[0]['p_apply'] is True
    await pg.click('.pc-home-btn');await pg.wait_for_timeout(300)
    # picture backup and restore
    await pg.click('.pc-menu-btn');await pg.click('#pcMenu button[data-tab=pictures]');await pg.wait_for_timeout(500)
    async with pg.expect_file_chooser() as fc: await pg.click('text=Upload pictures')
    await (await fc.value).set_files([{'name':'space-mountain.png','mimeType':'image/png','buffer':PNG},{'name':'polynesian-village-resort-night.png','mimeType':'image/png','buffer':PNG}])
    await pg.wait_for_timeout(2500)
    files=await pg.evaluate("Object.keys(window.__mem).sort()");print('backed up:',files, await pg.evaluate("[...document.querySelectorAll('[data-panel=pictures] [role=status]')].map(e=>e.textContent).join(' / ')"));assert len(files)==3 and any(f.endswith('manifest.json') for f in files)
    await pg.evaluate("async()=>{await new Promise(r=>{const q=indexedDB.open('parkCountdown');q.onsuccess=()=>{const tx=q.result.transaction('photos','readwrite');tx.objectStore('photos').clear();tx.oncomplete=r}});await new Promise(r=>{const q=indexedDB.open('parkCountdownResortArt');q.onsuccess=()=>{const tx=q.result.transaction('art','readwrite');tx.objectStore('art').clear();tx.oncomplete=r}})}")
    await pg.click('text=Restore from account');await pg.wait_for_timeout(1500)
    msg=await pg.evaluate("[...document.querySelectorAll('[data-panel=pictures] [role=status]')].map(e=>e.textContent).join(' / ')");print('restore:',msg);assert 'Restored 2 pictures' in msg
    await pg.evaluate("renderWalkStats()");assert 'See Plus' not in await pg.inner_text('#walkStats')
    assert not errs,errs;print('PASS: upgrade prompts, beta Plus, shared-trip update, picture backup and restore');await b.close()
asyncio.run(main())
