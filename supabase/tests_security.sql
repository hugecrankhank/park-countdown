\set ON_ERROR_STOP 0
-- people: A, B travelers; P planner; C client (email matches invite); X stranger
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-0000-0000-00000000000a','a@test.com',now()),('00000000-0000-0000-0000-00000000000b','b@test.com',now()),
 ('00000000-0000-0000-0000-0000000000a1','planner@test.com',now()),('00000000-0000-0000-0000-0000000000c1','client@test.com',now()),
 ('00000000-0000-0000-0000-0000000000ff','x@test.com',now());
insert into public.planner_access(user_id) values ('00000000-0000-0000-0000-0000000000a1');
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub',u,false); end $$;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.account_trips(title,arrival,departure) values('A trip','2027-01-27','2027-02-01');
select 'A sees own trips' t, count(*) from public.account_trips;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select 'B sees A trips (expect 0)' t, count(*) from public.account_trips;
update public.account_trips set title='hacked'; select 'B update affected nothing' t;
insert into public.account_trips(owner_id,title,arrival,departure) values('00000000-0000-0000-0000-00000000000a','forged','2027-01-01','2027-01-02');

-- planner creates a client and invite
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
insert into public.planner_clients(client_name,client_email,title,arrival,departure) values('Client','client@test.com','Client trip','2027-03-01','2027-03-05');
select 'planner sees clients' t, count(*) from public.planner_clients;
select public.issue_trip_invite((select id from public.planner_clients limit 1)) as token \gset

-- stranger tries to use the token and to see clients
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ff');
select 'stranger sees clients (expect 0)' t, count(*) from public.planner_clients;
select public.claim_trip_invite(:'token');
select public.issue_trip_invite((select id from public.planner_clients limit 1));

-- right client claims
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select 'client claimed trip' t, public.claim_trip_invite(:'token') is not null;
select 'client sees trip' t, count(*) from public.account_trips;
select public.claim_trip_invite(:'token');  -- reuse should fail

-- planner edits and publishes; client applies
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
update public.planner_clients set notes='Bring sunscreen';
select 'published rev' t, public.publish_client_update(id, revision) from public.planner_clients;
select public.send_planner_announcement(id,'Hello','Your trip is set') is not null as announced from public.planner_clients;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select 'updates waiting' t, count(*) from public.my_collaboration_updates() where published_revision>applied_revision;
select 'applied' t, public.apply_client_update(t.id, t.revision, c.published_revision) from public.account_trips t join public.my_collaboration_updates() c on c.trip_id=t.id;
select 'client notes now' t, notes from public.account_trips;
select 'client inbox' t, count(*) from public.account_planner_announcements;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select 'A sees announcements (expect 0)' t, count(*) from public.account_planner_announcements;
select 'export keys' t, (select string_agg(k,',') from jsonb_object_keys(public.export_my_account()) k);

-- trip sharing: A shares a trip with a friend (B) and with planner P
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.create_trip_share((select id from public.account_trips limit 1),'friend','{"schema":1,"time":"15:00","days":{"2027-01-28":{"parks":["mk"]}},"details":{"plans":[{"id":"1","name":"Dinner"}],"expenses":[{"id":"e","name":"Secret","amount":900}],"budget":5000}}'::jsonb,'Robert') as ftoken \gset
update public.account_trips set notes='Room 1234, conf ABC';
select public.create_trip_share((select id from public.account_trips limit 1),'planner',null,'Robert') as ptoken \gset
select 'A lists shares' t, count(*) from public.my_trip_shares();
reset role; set role anon;
select 'anon preview' t, public.preview_trip_share(:'ftoken')->>'status';
select public.claim_trip_share(:'ftoken');  -- anon cannot claim
reset role; set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select 'B sees share tables (expect error)' t, count(*) from public.trip_shares;
select 'friend claim' t, public.claim_trip_share(:'ftoken')->>'kind';
select public.claim_trip_share(:'ftoken');  -- second claim by same person fails
select 'friend trip notes empty' t, notes='' from public.account_trips;
select 'friend plan has no money' t, payload#>'{details,expenses}'='[]'::jsonb and (payload#>>'{details,budget}')::numeric=0 and jsonb_array_length(payload#>'{details,plans}')=1 from public.account_sync_snapshots;
select public.claim_trip_share(:'ptoken');  -- non-planner cannot claim planner link
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ff');
select public.stop_trip_share((select id from public.my_trip_shares() limit 1)); -- stranger owns none: no effect
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select 'planner claim' t, public.claim_trip_share(:'ptoken')->>'kind';
select 'planner sees notes+email' t, notes, client_email, client_name from public.planner_clients where shared_by is not null;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select public.claim_trip_share(:'ptoken');  -- single use
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.stop_trip_share(id) from public.my_trip_shares() where audience='friend';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select public.claim_trip_share(:'ftoken');  -- stopped
select 'export has share_links' t, public.export_my_account() ? 'share_links';
reset role;

-- wait predictions: collector ingests, anyone can read predictions, nobody can read raw tables
reset role;
select public.wait_collect();
insert into net._http_response(id,status_code,content) select request_id,200,'{"timezone":"America/New_York","liveData":[{"id":"r1","name":"Space Mountain","entityType":"ATTRACTION","parkId":"mk","status":"OPERATING","queue":{"STANDBY":{"waitTime":60}}},{"id":"r2","name":"Closed ride","entityType":"ATTRACTION","parkId":"mk","status":"CLOSED","queue":{"STANDBY":{"waitTime":null}}}]}' from public.wait_fetches;
select public.wait_collect();
select 'ingested rides' t, count(*) from public.wait_rides;
select public.wait_ingest('e957da41-3552-4cf6-b636-5babc5cbc4e5', now(), '{"timezone":"America/New_York","liveData":[{"id":"r1","name":"Space Mountain","entityType":"ATTRACTION","parkId":"mk","status":"OPERATING","queue":{"STANDBY":{"waitTime":30}}}]}');
select 'profile n, mean' t, n, round(mean) from public.wait_profile where ride_id='r1';
set role anon;
select 'anon prediction' t, name, wait from public.predict_waits('mk', current_date) limit 1;
select 'anon status' t, public.wait_prediction_status('e957da41-3552-4cf6-b636-5babc5cbc4e5')->>'days';
select count(*) from public.wait_profile;  -- expect permission denied
select public.wait_collect();               -- expect permission denied
reset role;

-- planner upgrade requests: X asks, A (admin) approves, X becomes a planner
insert into public.app_admins(user_id) values ('00000000-0000-0000-0000-00000000000a');
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ff');
select 'request emailed to' t, public.request_planner_upgrade('Xavier','Magic Travel','555-0100','','Please approve')->>'admin_email';
select 'X request status' t, public.my_planner_request()->>'status';
select public.planner_requests_for_admin();  -- not admin: expect error
select count(*) from public.planner_requests;  -- expect permission denied
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select public.request_planner_upgrade('Planner');  -- already a planner: expect error
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select 'admin sees pending' t, count(*) from public.planner_requests_for_admin();
select public.decide_planner_request(id, true) from public.planner_requests_for_admin();
reset role;
select 'X now planner' t, exists(select 1 from public.planner_access where user_id='00000000-0000-0000-0000-0000000000ff');
set role authenticated;
select public.decide_planner_request(id, false) from public.planner_requests_for_admin(true) limit 1;  -- already handled: expect error
reset role;

-- restaurant ratings: signed-in users rate, everyone sees averages, nobody reads the table
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.rate_restaurant('wdw','rest1',5);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select public.rate_restaurant('wdw','rest1',2);
select public.rate_restaurant('wdw','rest1',9);  -- expect error
select 'B sees avg, votes, mine' t, average, votes, mine from public.restaurant_ratings_for('wdw');
select count(*) from public.restaurant_ratings;  -- expect permission denied
select 'export has ratings' t, jsonb_array_length(public.export_my_account()->'restaurant_ratings');
select public.rate_restaurant('wdw','rest1',0);
reset role; set role anon;
select 'anon sees avg after B removed' t, average, votes, mine is null from public.restaurant_ratings_for('wdw');
select public.rate_restaurant('wdw','rest1',1);  -- expect error
reset role;

-- tiers: free accounts are locked out of paid features; beta, admin grants and planners unlock them
insert into auth.users(id,email,email_confirmed_at) values ('00000000-0000-0000-0000-0000000000f1','free@test.com',now()) on conflict do nothing;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select 'free tier' t, public.my_tier()->>'tier';
select * from public.predict_waits('mk', current_date);  -- expect PLUS_REQUIRED
select public.admin_set_plus('00000000-0000-0000-0000-0000000000f1', null);  -- expect admin error
select 'beta start' t, public.start_beta_plus()->>'via';
select 'plus can predict' t, count(*) >= 0 from public.predict_waits('mk', current_date);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.admin_set_plus('00000000-0000-0000-0000-0000000000f1', 0);
select public.admin_set_beta(false);
select 'admin lists accounts' t, count(*) > 3 from public.admin_accounts();
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select public.start_beta_plus();  -- expect beta ended
select 'back to free' t, public.my_tier()->>'tier';
-- live updates: planner P (has Plus) shares, free user F adds it, P pushes an update with a note
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
insert into public.account_trips(owner_id,title,arrival,departure,destination) values ('00000000-0000-0000-0000-0000000000a1','P trip','2027-03-01','2027-03-05','Walt Disney World');
select public.create_trip_share((select id from public.account_trips where title='P trip'),'friend','{"schema":1,"days":{},"details":{"plans":[]}}'::jsonb,'Pat') as utoken \gset
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select public.create_trip_share((select id from public.account_trips limit 1),'friend',null,'x');  -- expect PLUS_REQUIRED (or trip not found)
select public.claim_trip_share(:'utoken')->>'id' as ftrip \gset
select 'no update yet' t, count(*) from public.my_share_updates();
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
update public.account_trips set title='P trip v2' where title='P trip';
select 'pushed to' t, public.push_trip_share_update((select id from public.my_trip_shares() where audience='friend' limit 1),'{"schema":1,"days":{"2027-03-02":{"parks":["mk"]}},"details":{"plans":[{"id":"1","name":"Lunch"}],"budget":900}}'::jsonb,'Added lunch!');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select 'update waiting' t, sender, title, note from public.my_share_updates();
select 'applied' t, jsonb_array_length(public.apply_share_update(:'ftrip'::uuid)#>'{plan,details,plans}');
select 'F trip updated, no budget' t, t.title, (s.payload#>>'{details,budget}') from public.account_trips t join public.account_sync_snapshots s on s.trip_id=t.id where t.id=:'ftrip'::uuid;
select public.apply_share_update(:'ftrip'::uuid);  -- expect none waiting
reset role;

-- planner link updates: free user F is given Plus, shares with planner P, then pushes an update
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.admin_set_plus('00000000-0000-0000-0000-0000000000f1', null);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select public.create_trip_share(:'ftrip'::uuid,'planner','{"schema":1,"days":{},"details":{"plans":[],"budget":100}}'::jsonb,'Fran') as pl2 \gset
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select 'planner adds F' t, public.claim_trip_share(:'pl2')->>'kind';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select 'pushed to planners' t, public.push_trip_share_update((select id from public.my_trip_shares() where audience='planner' limit 1),'{"schema":1,"days":{},"details":{"plans":[],"budget":250}}'::jsonb,'Budget went up');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select 'planner sees update' t, traveler_note, traveler_plan#>>'{details,budget}' from public.planner_clients where client_name='Fran';
reset role;


-- planner client contact details and park-day / dining reservations
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
insert into public.planner_clients(client_name,client_email,title,arrival,departure,client_phone,client_address,travelers,reservations)
 values ('Dana','dana@test.com','Dana trip','2027-04-01','2027-04-03','334-555-0100','1 Main St','Dana 40, Sam 9',
 '[{"id":"11111111-1111-4111-8111-111111111111","kind":"Park day","status":"Planned","title":"Magic Kingdom Park","provider":"","location":"","confirmation":"","details":"","date":"2027-04-02","end_date":"","due_date":"","time":"","cost_cents":0,"paid_cents":0},{"id":"22222222-2222-4222-8222-222222222222","kind":"Dining","status":"Confirmed","title":"Be Our Guest","provider":"","location":"","confirmation":"ABC123","details":"","date":"2027-04-02","end_date":"","due_date":"","time":"18:15","cost_cents":0,"paid_cents":0}]'::jsonb);
select 'client contact saved' t, client_phone, jsonb_array_length(reservations) from public.planner_clients where client_name='Dana';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select 'other user sees Dana' t, count(*) from public.planner_clients where client_name='Dana';
reset role;

-- an imported hotel stay (end date and check-in time) passes the reservation rules
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
update public.planner_clients set reservations = reservations || '[{"id":"33333333-3333-4333-8333-333333333333","kind":"Resort / hotel","status":"Confirmed","title":"Disney''s Contemporary Resort","provider":"","location":"","confirmation":"91000000","details":"2 guests","date":"2027-04-01","end_date":"2027-04-03","due_date":"","time":"15:00","cost_cents":0,"paid_cents":0}]'::jsonb where client_name='Dana';
select 'imported hotel accepted' t, jsonb_array_length(reservations) from public.planner_clients where client_name='Dana';
reset role;
