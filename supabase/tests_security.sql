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
reset role;
