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
