# Browser test for wait predictions and the walking map (needs: cd dist && python3 -m http.server 8765)
import asyncio, json, math
from playwright.async_api import async_playwright
MK='75ea578a-adc8-4116-a54d-dccb60765ef9'; WDW='e957da41-3552-4cf6-b636-5babc5cbc4e5'
rides=[('r-sdmt','Seven Dwarfs Mine Train',70),('r-space','Space Mountain',55),('r-pirates','Pirates of the Caribbean',30)]
pred=[]
for rid,name,base in rides:
  for s in range(18,46):
    w=base*(0.5+0.8*math.sin((s-18)/28*math.pi))
    pred.append({'ride_id':rid,'name':name,'slot':s,'wait':int(round(w/5)*5),'spread':8,'samples':20,'days':12})
state={'trips':[{'id':'t1','name':"Lindsey's Birthday Trip",'date':'2027-01-27','endDate':'2027-02-01','time':'15:00','destId':WDW,'destName':'Walt Disney World (Florida)','tz':'America/New_York','days':{'2027-01-28':{'parks':[MK]}}}],
  'parks':{MK:{'name':'Magic Kingdom Park','destName':'Walt Disney World'}},'favs':{MK:['r-sdmt','r-space','r-pirates']},'destId':WDW}
dests={'destinations':[{'id':WDW,'name':'Walt Disney World® Resort','parks':[{'id':MK,'name':'Magic Kingdom Park'}]}]}
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome')
    ctx=await b.new_context(viewport={'width':390,'height':844},service_workers='block',geolocation={'latitude':28.4187,'longitude':-81.5812},permissions=['geolocation'])
    pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    async def route(r):
      u=r.request.url
      if 'account-config.js' in u: return await r.fulfill(body='window.PARK_ACCOUNTS={url:"https://x.supabase.co",key:"sb_publishable_x"};',content_type='application/javascript')
      if 'x.supabase.co/rest/v1/rpc/predict_waits' in u: return await r.fulfill(body=json.dumps(pred),content_type='application/json')
      if 'x.supabase.co/rest/v1/rpc/wait_prediction_status' in u: return await r.fulfill(body=json.dumps({'first_day':'2026-11-25','days':12,'sampled_days':['2026-11-25','2026-11-26']}),content_type='application/json')
      if 'themeparks.wiki/v1/destinations' in u: return await r.fulfill(body=json.dumps(dests),content_type='application/json')
      if 'themeparks.wiki' in u: return await r.fulfill(body=json.dumps({'children':[],'liveData':[]}),content_type='application/json')
      if 'leaflet' in u and u.endswith('.js'): return await r.fulfill(path=__import__('os').path.join(__import__('os').path.dirname(__file__),'leaflet-standin.js'),content_type='application/javascript')
      if 'leaflet' in u: return await r.fulfill(body='',content_type='text/css')
      if u.startswith('http://localhost'): return await r.continue_()
      await r.abort()
    await pg.route('**/*',route)
    await pg.goto('http://localhost:8765/index.html')
    pts=[[28.4187+i*0.0004,-81.5812+i*0.0003] for i in range(60)]
    await pg.evaluate("([s,p])=>{localStorage.setItem('parkCountdown.v1',JSON.stringify(s));const d=new Date();const k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');localStorage.setItem('parkCountdown.v1.walk',JSON.stringify({gps:{[k+'T10']:2500},health:{},paths:{[k]:p}}));sessionStorage.setItem('parkCountdown.portal.entered','1')}",[state,pts])
    await pg.reload();await pg.wait_for_timeout(1500)
    await pg.click('.pc-menu-btn');print('menu:',await pg.evaluate("[...document.querySelectorAll('#pcMenu button')].map(b=>b.textContent).join(' | ')"))
    await pg.click('#pcMenu button[data-tab=predict]');await pg.wait_for_timeout(1500)
    print('status:',await pg.inner_text('#spStatus'))
    print('plan:',(await pg.inner_text('#spPlan'))[:300].replace('\n',' | '))
    print('first ride:',(await pg.locator('.sp-ride').first.inner_text()).replace('\n',' | ')[:250])
    await pg.locator('[data-panel=predict]').screenshot(path='/tmp/pred.png')
    # map
    await pg.click('.pc-menu-btn');await pg.click('#pcMenu button[data-tab=map]');await pg.wait_for_timeout(2500)
    print('dist box:',await pg.evaluate("document.querySelector('.wk-dist')?.innerText"))
    print('mile markers:',await pg.evaluate("document.querySelectorAll('.wk-mile').length"))
    await pg.locator('#map').screenshot(path='/tmp/mapdist.png')
    print('errors:',errs)
    await b.close()
asyncio.run(main())
