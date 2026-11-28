# Browser test: import a (made-up) My Plans PDF on Trips and into the planner client form (needs local server on 8765)
import asyncio, json, os
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__));FAKE=open(os.path.join(HERE,'fake-supabase.js')).read();PDF=os.path.join(HERE,'fixtures','myplans-sample.pdf')
WDW='e957da41-3552-4cf6-b636-5babc5cbc4e5'
dests={'destinations':[{'id':WDW,'name':'Walt Disney World® Resort','parks':[{'id':'mk','name':'Magic Kingdom Park'},{'id':'ep','name':'EPCOT'},{'id':'hs','name':"Disney's Hollywood Studios"},{'id':'ak','name':"Disney's Animal Kingdom Theme Park"}]}]}
async def page(b,sb):
  ctx=await b.new_context(viewport={'width':390,'height':844},service_workers='block')
  pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
  async def route(r):
    u=r.request.url
    if 'supabase-js' in u: return await r.fulfill(body=FAKE,content_type='application/javascript')
    if 'account-config.js' in u: return await r.fulfill(body='window.PARK_ACCOUNTS={url:"https://x.supabase.co",key:"sb_publishable_x"};',content_type='application/javascript')
    if 'themeparks.wiki/v1/destinations' in u: return await r.fulfill(body=json.dumps(dests),content_type='application/json')
    if 'themeparks.wiki' in u: return await r.fulfill(body=json.dumps({'liveData':[],'children':[]}),content_type='application/json')
    if u.startswith('http://localhost'): return await r.continue_()
    await r.abort()
  await pg.route('**/*',route)
  await pg.goto('http://localhost:8765/index.html')
  await pg.evaluate("f=>{localStorage.clear();localStorage.setItem('fakesb',JSON.stringify(f));sessionStorage.setItem('parkCountdown.portal.entered','1')}",sb)
  await pg.goto('about:blank');await pg.goto('http://localhost:8765/index.html');await pg.wait_for_timeout(2500)
  return pg,errs
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome')
    # traveler, signed out, no trips yet
    pg,errs=await page(b,{'tables':{}})
    await pg.evaluate("showTab('trips')");await pg.wait_for_timeout(300)
    async with pg.expect_file_chooser() as fc: await pg.click('#mdxPick')
    await (await fc.value).set_files(PDF);await pg.wait_for_timeout(3000)
    pv=await pg.inner_text('#mdxPreview');print('preview:',pv[:260].replace('\n',' | '))
    assert "Contemporary Resort" in pv and '4 park days' in pv and '5 dining' in pv, (pv, await pg.inner_text('#mdxStatus'))
    await pg.click('#mdxPreview >> text=Add this trip');await pg.wait_for_timeout(800)
    st=await pg.inner_text('#mdxStatus');print('status:',st)
    t=await pg.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('parkCountdown.v1'));const t=s.trips[0];const c=JSON.parse(localStorage.getItem('parkCountdown.v2.preview'));return {name:t.name,date:t.date,end:t.endDate,time:t.time,days:Object.fromEntries(Object.entries(t.days).map(([d,v])=>[d,v.parks])),plans:c.data[t.id].plans.map(p=>[p.date,p.time,p.kind,p.name])}})()")
    print('trip:',json.dumps(t)[:400])
    assert t['date']=='2027-01-27' and t['end']=='2027-02-01' and t['time']=='15:00' and t['days']=={'2027-01-28':['mk'],'2027-01-29':['ep'],'2027-01-30':['hs'],'2027-01-31':['mk']} and len(t['plans'])==5
    # importing again updates instead of doubling
    await pg.click('#mdxPasteBtn');await pg.fill('#mdxText',open(os.path.join(HERE,'fixtures','myplans-sample.txt')).read());await pg.click('#mdxRead');await pg.wait_for_timeout(300)
    await pg.click('#mdxPreview >> text=Import');await pg.wait_for_timeout(600)
    n=await pg.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('parkCountdown.v1'));const c=JSON.parse(localStorage.getItem('parkCountdown.v2.preview'));return [s.trips.length,c.data[s.trips[0].id].plans.length]})()");print('after re-import (trips, plans):',n);assert n==[1,5]
    assert not errs,errs
    # planner client form
    sb={'user':{'id':'u-p','email':'p@test.com'},'tables':{'planner_access':[{'user_id':'u-p'}],'planner_clients':[],'agency_members':[],'customer_profiles':[],'travel_agencies':[]},'rpc':{'my_tier':{'tier':'planner','via':'planner'},'is_app_admin':False}}
    pg,errs=await page(b,sb);await pg.wait_for_timeout(800)
    async with pg.expect_file_chooser() as fc: await pg.click('.pc-mdx >> text=Choose My Plans PDF')
    await (await fc.value).set_files(PDF);await pg.wait_for_timeout(3000)
    print('planner status:',await pg.inner_text('.pc-mdx [role=status]'))
    vals=await pg.evaluate("Object.fromEntries(['client_name','title','arrival','departure','party_size','resort_type','resort','travelers'].map(n=>[n,document.querySelector(`[name=${n}]`)?.value]))");print('filled:',vals)
    assert vals['arrival']=='2027-01-27' and vals['departure']=='2027-02-01' and vals['client_name']=='Alex Q Sample' and 'Contemporary' in vals['resort']
    await pg.fill('#pc-client_email','alex@test.com')
    await pg.get_by_role('button',name='Add client',exact=True).click();await pg.wait_for_timeout(2500)
    ins=await pg.evaluate("JSON.parse(localStorage.getItem('fakesb')).calls.filter(c=>c.name==='insert:planner_clients').map(c=>c.args)")
    assert ins,(errs,await pg.evaluate("[...document.querySelectorAll('#pcPortal :invalid')].map(e=>e.name)"))
    kinds=[(r['kind'],r['date'],r['confirmation'][:2]) for r in ins[0]['reservations']];print('saved reservations:',kinds)
    assert sum(k=='Park day' for k,_,_ in kinds)==4 and sum(k=='Dining' for k,_,_ in kinds)==5 and sum(k=='Resort / hotel' for k,_,_ in kinds)==1 and all(len(r)==14 for r in ins[0]['reservations'])
    assert not errs,errs;print('PASS: My Disney Experience import on Trips and in the planner form');await b.close()
asyncio.run(main())
