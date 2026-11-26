# Browser test for trip sharing (needs: cd dist && python3 -m http.server 8765)
import asyncio, json
from playwright.async_api import async_playwright
FAKE=open(__import__('os').path.join(__import__('os').path.dirname(__file__),'fake-supabase.js')).read()
TOK='a'*48
PLAN={"schema":1,"time":"15:00","days":{"2027-01-28":{"parks":["mk"]}},"parks":{"mk":{"name":"Magic Kingdom"}},"details":{"plans":[{"id":"p1","date":"2027-01-28","time":"18:00","name":"Be Our Guest","kind":"Dining","park":"Magic Kingdom","note":"","done":False}],"checks":[],"milestones":[],"wish":[],"expenses":[],"rides":[],"budget":0}}
TRIP=dict(id='t-new',owner_id='u-b',title="Lindsey's Birthday Trip",arrival='2027-01-27',departure='2027-02-01',resort='Disney\'s Contemporary Resort',destination='Walt Disney World (Florida)',party_size=2,status='booked',notes='',revision=1,reservations=[])
async def page(b,state,url):
  ctx=await b.new_context(viewport={'width':390,'height':844},service_workers='block')
  pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
  async def route(r):
    u=r.request.url
    if 'supabase-js' in u: return await r.fulfill(body=FAKE,content_type='application/javascript')
    if u.endswith('account-config.js') or 'account-config.js?' in u: return await r.fulfill(body='window.PARK_ACCOUNTS={url:"https://x.supabase.co",key:"sb_publishable_x"};',content_type='application/javascript')
    if u.startswith('http://localhost'): return await r.continue_()
    await r.abort()
  await pg.route('**/*',route)
  await pg.goto('http://localhost:8765/index.html');await pg.evaluate("s=>{localStorage.clear();localStorage.setItem('fakesb',JSON.stringify(s));sessionStorage.setItem('parkCountdown.portal.entered','1')}",state)
  await pg.goto("about:blank");await pg.goto(url);await pg.wait_for_timeout(1500);return pg,errs
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome')
    # 1. friend receives
    st={'user':{'id':'u-b','email':'b@test.com'},'tables':{},'claimInsert':TRIP,'rpc':{
      'preview_trip_share':{'audience':'friend','sender':'Robert','title':TRIP['title'],'arrival':'2027-01-27','departure':'2027-02-01','destination':'Walt Disney World','resort':TRIP['resort'],'has_plan':True,'park_days':1,'activities':1,'reservations':0,'status':'ready','already_added':False,'own':False},
      'claim_trip_share':{'kind':'trip','id':'t-new','plan':PLAN}}}
    pg,errs=await page(b,st,'http://localhost:8765/index.html#share='+TOK)
    print('friend screen:',(await pg.inner_text('#pcPortal'))[:400].replace('\n',' | '))
    await pg.screenshot(path='/tmp/share-friend.png')
    await pg.click('text=Add to my trips');await pg.wait_for_timeout(1500)
    print('portal hidden:',await pg.evaluate("document.querySelector('#pcPortal').hidden"))
    print('home hero:',(await pg.inner_text('#hero'))[:120].replace('\n',' | '))
    print('local plan:',await pg.evaluate("JSON.stringify(JSON.parse(localStorage.getItem('parkCountdown.v1')).trips.map(t=>[t.name,t.days]))"))
    print('errors:',errs)
    # 2. sender creates a share
    trip=dict(TRIP,id='t-a',owner_id='u-a')
    st2={'user':{'id':'u-a','email':'a@test.com'},'tables':{'account_trips':[trip]},'rpc':{'create_trip_share':'b'*48,'my_trip_shares':[{'id':'s1','trip_id':'t-a','audience':'friend','claims':0,'max_claims':20,'expires_at':'2027-12-01T00:00:00Z','revoked_at':None,'created_at':'2026-11-25T00:00:00Z'}]}}
    pg,errs=await page(b,st2,'http://localhost:8765/index.html')
    await pg.click('.pc-account-btn');await pg.wait_for_timeout(1200)
    await pg.click('text=Share (QR code)');await pg.fill('[id^=pc-share-name]','Robert');await pg.click('text=Friends & family');await pg.wait_for_timeout(800)
    print('qr canvas:',await pg.evaluate("!!document.querySelector('.pc-share canvas')"),'link:',await pg.evaluate("document.querySelector('.pc-share input[readonly]')?.value"))
    print('share list:',(await pg.inner_text('.pc-share-list')).replace('\n',' | '))
    print('rpc args:',await pg.evaluate("JSON.stringify(JSON.parse(localStorage.getItem('fakesb')).calls.filter(c=>c.name==='create_trip_share').map(c=>[c.args.p_audience,c.args.p_sender_name,!!c.args.p_plan]))"))
    await pg.locator('.pc-share').screenshot(path='/tmp/share-sender.png')
    print('errors:',errs)
    # 3. planner sees shared client
    client=dict(id='c1',planner_id='u-p',agency_id=None,client_name='Robert',client_email='a@test.com',title=TRIP['title'],arrival='2027-01-27',departure='2027-02-01',resort=TRIP['resort'],destination='Walt Disney World (Florida)',party_size=2,notes='Room near monorail',reservations=[],revision=1,customer_id=None,traveler_plan=dict(PLAN,details=dict(PLAN['details'],expenses=[{'id':'e','name':'Park tickets','amount':1200}],budget=5000)),shared_by='u-a')
    st3={'user':{'id':'u-p','email':'p@test.com'},'tables':{'planner_access':[{'user_id':'u-p'}],'planner_clients':[client],'agency_members':[],'customer_profiles':[],'travel_agencies':[]},'rpc':{}}
    pg,errs=await page(b,st3,'http://localhost:8765/index.html')
    print('planner opens on:',await pg.evaluate("document.querySelector('#pcPortal').dataset.view"));await pg.wait_for_timeout(1500)
    await pg.click('text=View traveler’s day plan');await pg.wait_for_timeout(200)
    print('planner card:',(await pg.locator('#pc-clients article').first.inner_text())[:700].replace('\n',' | '))
    print('errors:',errs)
    await b.close()
asyncio.run(main())
