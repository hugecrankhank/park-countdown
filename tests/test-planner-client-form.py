# Browser test: planner adds a client with contact details, a park per day and booked dining (needs local server on 8765)
import asyncio, json, os
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__));FAKE=open(os.path.join(HERE,'fake-supabase.js')).read()
sb={'user':{'id':'u-p','email':'p@test.com'},'tables':{'planner_access':[{'user_id':'u-p'}],'planner_clients':[],'agency_members':[],'customer_profiles':[],'travel_agencies':[]},'rpc':{'my_tier':{'tier':'planner','via':'planner'},'is_app_admin':False}}
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome')
    ctx=await b.new_context(viewport={'width':390,'height':844},service_workers='block')
    pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    async def route(r):
      u=r.request.url
      if 'supabase-js' in u: return await r.fulfill(body=FAKE,content_type='application/javascript')
      if 'account-config.js' in u: return await r.fulfill(body='window.PARK_ACCOUNTS={url:"https://x.supabase.co",key:"sb_publishable_x"};',content_type='application/javascript')
      if 'themeparks.wiki' in u: return await r.fulfill(body=json.dumps({'destinations':[],'liveData':[],'children':[]}),content_type='application/json')
      if u.startswith('http://localhost'): return await r.continue_()
      await r.abort()
    await pg.route('**/*',route)
    await pg.goto('http://localhost:8765/index.html')
    await pg.evaluate("f=>{localStorage.clear();localStorage.setItem('fakesb',JSON.stringify(f))}",sb)
    await pg.goto('about:blank');await pg.goto('http://localhost:8765/index.html');await pg.wait_for_timeout(3000)
    assert await pg.evaluate("document.querySelector('#pcPortal').dataset.view")=='planner'
    await pg.fill('#pc-client_name','Dana Client');await pg.fill('#pc-client_email','dana@test.com');await pg.fill('#pc-title','Spring trip')
    await pg.fill('#pc-arrival','2027-04-01');await pg.fill('#pc-departure','2027-04-03');await pg.dispatch_event('#pc-departure','change')
    print('day rows:',await pg.locator('.pc-days input').count());assert await pg.locator('.pc-days input').count()==3
    await pg.fill('#pc-client_phone','334-555-0100');await pg.fill('#pc-client_address','1 Main St, Millbrook AL');await pg.fill('#pc-travelers','Dana 40, Sam 9')
    await pg.fill('#pc-park-2027-04-02','Magic Kingdom Park')
    await pg.click('text=Add dining reservation');await pg.fill('[data-f=date]','2027-04-02');await pg.fill('[data-f=time]','18:15');await pg.fill('[data-f=title]','Be Our Guest');await pg.fill('[data-f=conf]','ABC123')
    form=(await pg.inner_text('#pcPortal'));print('form sections:',[h for h in ['Contact details','Park for each day','Booked dining'] if h in form])
    await pg.get_by_role('button',name='Add client',exact=True).click();await pg.wait_for_timeout(2500)
    ins=await pg.evaluate("JSON.parse(localStorage.getItem('fakesb')).calls.filter(c=>c.name==='insert:planner_clients').map(c=>c.args)")
    assert ins, (errs, await pg.evaluate("[...document.querySelectorAll('#pcPortal [role=alert],#pcPortal [role=status],#pcPortal .pc-msg,#pcPortal .pc-error')].map(e=>e.textContent).join(' // ')+' INVALID:'+[...document.querySelectorAll('#pcPortal :invalid')].map(e=>e.name||e.id).join(',')"))
    a=ins[0];print('saved:',a['client_phone'],'|',a['travelers'],'|',[(r['kind'],r['title'],r['date'],r['time'],r['confirmation']) for r in a['reservations']])
    assert a['client_phone']=='334-555-0100' and a['arrival']=='2027-04-01' and len(a['reservations'])==2 and all(len(r)==14 for r in a['reservations'])
    card=await pg.locator('#pc-clients article').first.inner_text();print('card:',card[:330].replace('\n',' | '))
    assert '334-555-0100' in card and 'Day by day' in card
    assert not errs,errs;print('PASS: planner client form saves contact details, park days and dining');await b.close()
asyncio.run(main())
