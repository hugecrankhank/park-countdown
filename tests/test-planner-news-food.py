# Browser test: trip planner guide, News & videos, Food & ratings (needs: cd dist && python3 -m http.server 8765)
import asyncio, json, os
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__))
FAKE=open(os.path.join(HERE,'fake-supabase.js')).read()
MK='75ea578a-adc8-4116-a54d-dccb60765ef9'; WDW='e957da41-3552-4cf6-b636-5babc5cbc4e5'
state={'trips':[{'id':'t1','name':"Lindsey's Birthday Trip",'date':'2027-01-27','endDate':'2027-01-29','time':'15:00','destId':WDW,'destName':'Walt Disney World (Florida)','tz':'America/New_York','days':{'2027-01-28':{'parks':[MK]}}}],
  'parks':{MK:{'name':'Magic Kingdom Park'}},'favs':{},'destId':WDW}
feeds={'updated':'2026-11-26T04:00:00Z','items':[
 {'kind':'video','title':'Magic Kingdom tips for 2027','link':'https://www.youtube.com/watch?v=abcdefghijk','videoId':'abcdefghijk','source':'Vlogger','date':'2026-11-26T03:00:00Z'},
 {'kind':'blog','title':'Disneyland adds a new parade','link':'https://example.com/p','source':'Some Blog','date':'2026-11-25T03:00:00Z'},
 {'kind':'blog','title':'Bad link','link':'javascript:alert(1)','source':'Evil','date':'2026-11-25T02:00:00Z'}],
 'sources':[{'name':'Some Blog','kind':'blog','ok':True},{'name':'Vlogger','kind':'video','ok':True}]}
kids={'children':[{'id':MK,'name':'Magic Kingdom Park','entityType':'PARK','parentId':WDW},{'id':'r1','name':'Be Our Guest Restaurant','entityType':'RESTAURANT','parentId':MK},{'id':'r2','name':'Jaleo','entityType':'RESTAURANT','parentId':WDW},{'id':'a1','name':'Space Mountain','entityType':'ATTRACTION','parentId':MK}]}
sb={'user':{'id':'u-a','email':'a@test.com'},'tables':{'account_trips':[]},'rpc':{'my_tier':{'tier':'plus','via':'admin'},'is_app_admin':False,'restaurant_ratings_for':[{'restaurant_id':'r2','average':4.5,'votes':2,'mine':None}]}}
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome')
    ctx=await b.new_context(viewport={'width':390,'height':844},service_workers='block')
    pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    async def route(r):
      u=r.request.url
      if 'supabase-js' in u: return await r.fulfill(body=FAKE,content_type='application/javascript')
      if 'account-config.js' in u: return await r.fulfill(body='window.PARK_ACCOUNTS={url:"https://x.supabase.co",key:"sb_publishable_x"};',content_type='application/javascript')
      if '/api/feeds' in u: return await r.fulfill(body=json.dumps(feeds),content_type='application/json')
      if 'themeparks.wiki' in u and u.endswith('/children'): return await r.fulfill(body=json.dumps(kids),content_type='application/json')
      if 'themeparks.wiki' in u: return await r.fulfill(body=json.dumps({'destinations':[],'liveData':[],'children':[]}),content_type='application/json')
      if u.startswith('http://localhost'): return await r.continue_()
      await r.abort()
    await pg.route('**/*',route)
    await pg.goto('http://localhost:8765/index.html')
    await pg.evaluate("([s,f])=>{localStorage.clear();localStorage.setItem('parkCountdown.v1',JSON.stringify(s));localStorage.setItem('fakesb',JSON.stringify(f));sessionStorage.setItem('parkCountdown.portal.entered','1')}",[state,sb])
    await pg.goto('about:blank');await pg.goto('http://localhost:8765/index.html');await pg.wait_for_timeout(2000)
    g=(await pg.inner_text('#planGuide')).replace('\n',' | ');print('guide:',g[:700])
    assert 'Trip planner' in g and 'of 6 done' in g and 'Next: Choose a park for each day' in g and 'Lightning Lane' in g, g
    await pg.locator('#planGuide').screenshot(path='/tmp/guide.png')
    await pg.click('#planGuide .pg-step button.pg-dot >> nth=0');await pg.wait_for_timeout(200)
    assert '1 of 6 done' in await pg.inner_text('#planGuide')
    await pg.click('.pc-menu-btn');m=await pg.evaluate("[...document.querySelectorAll('#pcMenu > *')].map(b=>(b.tagName==='DIV'?'# ':'')+b.textContent.trim()).join(' | ')");print('menu:',m)
    await pg.click('#pcMenu button[data-tab=news]');await pg.wait_for_timeout(800)
    n=(await pg.inner_text('[data-panel=news]')).replace('\n',' | ');print('news:',n[:420])
    assert 'Magic Kingdom tips for 2027' in n and 'Bad link' not in n
    await pg.click('#nvKind >> text=For my trip');await pg.wait_for_timeout(200)
    assert await pg.locator('.nv-item').count()==1
    await pg.click('.nv-thumb');assert 'youtube-nocookie.com/embed/abcdefghijk' in await pg.get_attribute('.nv-player','src')
    await pg.locator('[data-panel=news]').screenshot(path='/tmp/news.png')
    await pg.click('.pc-menu-btn');await pg.click('#pcMenu button[data-tab=food]');await pg.wait_for_timeout(1000)
    f=(await pg.inner_text('[data-panel=food]')).replace('\n',' | ');print('food:',f[-330:])
    assert 'Jaleo' in f and '4.5' in f and 'Space Mountain' not in f
    await pg.click('.fd-item >> nth=1 >> .fd-stars button >> nth=3');await pg.wait_for_timeout(500)
    call=await pg.evaluate("JSON.parse(localStorage.getItem('fakesb')).calls.filter(c=>c.name==='rate_restaurant').map(c=>c.args)");print('rate call:',call)
    assert call and call[0]['p_stars']==4 and call[0]['p_restaurant']=='r1'
    await pg.locator('[data-panel=food]').screenshot(path='/tmp/food.png')
    assert not errs,errs;print('PASS: planner guide, news & videos, food & ratings')
    await b.close()
asyncio.run(main())
