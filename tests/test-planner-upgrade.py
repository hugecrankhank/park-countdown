import asyncio, json
exec(open('/tmp/sharetest.py').read().split('async def main')[0])
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome')
    st={'user':{'id':'u-x','email':'x@test.com'},'tables':{'account_trips':[]},'rpc':{'is_app_admin':False,'my_planner_request':None,'request_planner_upgrade':{'id':'q1','status':'pending','email':'x@test.com','admin_email':'owner@example.com'}}}
    pg,errs=await page(b,st,'http://localhost:8765/index.html')
    await pg.click('.pc-account-btn');await pg.wait_for_timeout(1200)
    print('upgrade card:',(await pg.inner_text('#pc-upgrade'))[:160].replace('\n',' | '))
    await pg.click('text=Upgrade to travel planner')
    await pg.fill('#pc-name','Xavier');await pg.fill('#pc-business','Magic Travel Co');await pg.fill('#pc-message','I book 40 Disney trips a year')
    await pg.click('text=Send request');await pg.wait_for_timeout(1200)
    calls=await pg.evaluate("JSON.parse(localStorage.getItem('fakesb')).calls.filter(c=>c.name==='request_planner_upgrade').map(c=>c.args)")
    print('request args:',calls)
    href=await pg.evaluate("document.querySelector('#pc-upgrade a')?.href")
    import urllib.parse; print('email to:',href.split('?')[0] if href else None); print('subject:',urllib.parse.unquote(href.split('subject=')[1].split('&')[0]) if href else None)
    # planner screen for non-planner
    await pg.evaluate("document.querySelector('.pc-top button')&&0")
    # admin view
    st2={'user':{'id':'u-a','email':'owner@example.com'},'tables':{'account_trips':[]},'rpc':{'is_app_admin':True,'my_planner_request':None,'planner_requests_for_admin':[{'id':'q1','email':'x@test.com','name':'Xavier','business':'Magic Travel Co','phone':'555-0100','website':'','message':'I book 40 Disney trips a year','status':'pending','created_at':'2026-11-25T20:00:00Z','decided_at':None}]}}
    pg2,errs2=await page(b,st2,'http://localhost:8765/index.html');await pg2.click('.pc-account-btn');await pg2.wait_for_timeout(1500)
    print('admin card:',(await pg2.inner_text('#pc-admin-requests'))[:250].replace('\n',' | '))
    await pg2.click('#pc-admin-requests >> text=Approve');await pg2.wait_for_timeout(600)
    print('approve call:',await pg2.evaluate("JSON.parse(localStorage.getItem('fakesb')).calls.filter(c=>c.name==='decide_planner_request').map(c=>c.args)"))
    await pg2.locator('#pc-admin-requests').screenshot(path='/tmp/admin.png')
    print('errors:',errs,errs2);await b.close()
asyncio.run(main())
