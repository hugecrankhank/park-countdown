-- Share a trip by QR code / link.
--  friend : copies trip basics + day plans into the friend's own account (reusable link, 14 days, up to 20 people)
--  planner: copies everything (notes, reservations & payments, budget, expenses, ride log, traveler contact)
--           into an approved travel planner's client list (single use, 7 days)
-- Tables are function-only: no direct client access.

create table public.trip_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  trip_id uuid not null references public.account_trips(id) on delete cascade,
  audience text not null check (audience in ('friend','planner')),
  token_hash text not null unique,
  sender_name text not null default '' check (length(sender_name) <= 160),
  trip jsonb not null check (jsonb_typeof(trip) = 'object'),
  plan jsonb check (plan is null or (jsonb_typeof(plan) = 'object' and coalesce(plan->>'schema','') = '1' and octet_length(plan::text) <= 1048576)),
  max_claims integer not null check (max_claims between 1 and 20),
  claims integer not null default 0,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (claims >= 0 and claims <= max_claims)
);
create index trip_shares_owner_idx on public.trip_shares(owner_id);
create index trip_shares_trip_idx on public.trip_shares(trip_id);

create table public.trip_share_claims (
  share_id uuid not null references public.trip_shares(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  primary key (share_id, user_id)
);
create index trip_share_claims_user_idx on public.trip_share_claims(user_id);

alter table public.trip_shares enable row level security;
alter table public.trip_share_claims enable row level security;
revoke all on public.trip_shares, public.trip_share_claims from anon, authenticated;

-- Planner copies keep the traveler's plan and who shared it.
alter table public.planner_clients add column traveler_plan jsonb,
  add column shared_by uuid references auth.users(id) on delete set null;
alter table public.planner_clients add constraint planner_clients_traveler_plan_check
  check (traveler_plan is null or (jsonb_typeof(traveler_plan) = 'object' and coalesce(traveler_plan->>'schema','') = '1' and octet_length(traveler_plan::text) <= 1048576));
create index planner_clients_shared_by_idx on public.planner_clients(shared_by);

-- Friends get plans, packing list, milestones and wish list; never money, ride history or notes.
create or replace function public.friend_plan(p jsonb) returns jsonb
 language sql immutable set search_path to '' as $$
 select case when p is null then null else
  jsonb_build_object('schema',1,'time',p->'time','days',coalesce(p->'days','{}'::jsonb),'parks',coalesce(p->'parks','{}'::jsonb),
   'details', jsonb_strip_nulls(jsonb_build_object(
     'plans',coalesce(p#>'{details,plans}','[]'::jsonb),'checks',coalesce(p#>'{details,checks}','[]'::jsonb),
     'milestones',coalesce(p#>'{details,milestones}','[]'::jsonb),'wish',coalesce(p#>'{details,wish}','[]'::jsonb),
     'dayParks',p#>'{details,dayParks}','mode',p#>'{details,mode}',
     'expenses','[]'::jsonb,'rides','[]'::jsonb,'budget',0)))
 end $$;

create or replace function public.create_trip_share(p_trip uuid, p_audience text, p_plan jsonb default null, p_sender_name text default '')
 returns text language plpgsql security definer set search_path to '' as $$
declare t public.account_trips%rowtype; raw_token text; info jsonb; plan jsonb;
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'Confirm your email first'; end if;
 if p_audience not in ('friend','planner') then raise exception 'Choose friend or planner'; end if;
 select * into t from public.account_trips where id=p_trip and owner_id=auth.uid();
 if not found then raise exception 'Trip not found'; end if;
 if p_plan is not null and (jsonb_typeof(p_plan)<>'object' or coalesce(p_plan->>'schema','')<>'1' or octet_length(p_plan::text)>1000000) then raise exception 'Day plans could not be shared'; end if;
 if (select count(*) from public.trip_shares where owner_id=auth.uid() and revoked_at is null and expires_at>now())>=50 then raise exception 'Too many active share links. Stop sharing an older one first.'; end if;
 info:=jsonb_build_object('title',t.title,'arrival',t.arrival,'departure',t.departure,'destination',t.destination,'resort',t.resort,'party_size',t.party_size);
 if p_audience='planner' then info:=info||jsonb_build_object('notes',t.notes,'status',t.status,'reservations',t.reservations); plan:=p_plan;
 else plan:=public.friend_plan(p_plan); end if;
 raw_token:=encode(extensions.gen_random_bytes(24),'hex');
 insert into public.trip_shares(owner_id,trip_id,audience,token_hash,sender_name,trip,plan,max_claims,expires_at)
 values(auth.uid(),t.id,p_audience,encode(extensions.digest(raw_token,'sha256'),'hex'),left(trim(coalesce(p_sender_name,'')),160),info,plan,
  case when p_audience='planner' then 1 else 20 end, now()+case when p_audience='planner' then interval '7 days' else interval '14 days' end);
 return raw_token;
end $$;

-- Safe summary for the receiving screen (works before sign-in; the token itself is the secret).
create or replace function public.preview_trip_share(p_token text)
 returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare s public.trip_shares%rowtype;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{48}$' then raise exception 'Invalid share link'; end if;
 select * into s from public.trip_shares where token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
 if not found then raise exception 'This share link is not available'; end if;
 return jsonb_build_object('audience',s.audience,'sender',s.sender_name,'title',s.trip->>'title','arrival',s.trip->>'arrival','departure',s.trip->>'departure',
  'destination',s.trip->>'destination','resort',s.trip->>'resort','has_plan',s.plan is not null,
  'park_days',coalesce((select count(*) from jsonb_object_keys(coalesce(s.plan->'days','{}'::jsonb))),0),
  'activities',coalesce(jsonb_array_length(s.plan#>'{details,plans}'),0),
  'reservations',case when s.audience='planner' then coalesce(jsonb_array_length(s.trip->'reservations'),0) else 0 end,
  'status',case when s.revoked_at is not null then 'stopped' when s.expires_at<=now() then 'expired' when s.claims>=s.max_claims then 'used' else 'ready' end,
  'expires_at',s.expires_at,
  'already_added',auth.uid() is not null and exists(select 1 from public.trip_share_claims c where c.share_id=s.id and c.user_id=auth.uid()),
  'own',auth.uid() is not null and s.owner_id=auth.uid());
end $$;

create or replace function public.claim_trip_share(p_token text)
 returns jsonb language plpgsql security definer set search_path to '' as $$
declare s public.trip_shares%rowtype; new_id uuid; owner_email text; who_email text;
begin
 if auth.uid() is null or p_token is null or p_token !~ '^[a-f0-9]{48}$' then raise exception 'Invalid share link'; end if;
 select email into who_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if who_email is null then raise exception 'Confirm your email first'; end if;
 select * into s from public.trip_shares where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
 if not found then raise exception 'This share link is not available'; end if;
 if s.revoked_at is not null then raise exception 'The sender stopped sharing this trip'; end if;
 if s.expires_at<=now() then raise exception 'This share link has expired. Ask for a new one.'; end if;
 if s.owner_id=auth.uid() then raise exception 'This is your own trip'; end if;
 if exists(select 1 from public.trip_share_claims where share_id=s.id and user_id=auth.uid()) then raise exception 'You already added this trip'; end if;
 if s.claims>=s.max_claims then raise exception 'This share link has already been used'; end if;
 if s.audience='planner' then
  if not exists(select 1 from public.planner_access where user_id=auth.uid()) then raise exception 'This link is for an approved travel planner account'; end if;
  select email into owner_email from auth.users where id=s.owner_id;
  insert into public.planner_clients(planner_id,agency_id,client_name,client_email,title,arrival,departure,resort,destination,party_size,notes,reservations,traveler_plan,shared_by)
  values(auth.uid(),null,coalesce(nullif(s.sender_name,''),split_part(owner_email,'@',1)),lower(owner_email),s.trip->>'title',(s.trip->>'arrival')::date,(s.trip->>'departure')::date,
   coalesce(s.trip->>'resort',''),coalesce(s.trip->>'destination','Walt Disney World'),coalesce((s.trip->>'party_size')::int,1),left(coalesce(s.trip->>'notes',''),8000),
   coalesce(s.trip->'reservations','[]'::jsonb),s.plan,s.owner_id) returning id into new_id;
 else
  insert into public.account_trips(owner_id,title,arrival,departure,resort,destination,party_size,status,notes,reservations)
  values(auth.uid(),s.trip->>'title',(s.trip->>'arrival')::date,(s.trip->>'departure')::date,coalesce(s.trip->>'resort',''),coalesce(s.trip->>'destination','Walt Disney World'),
   coalesce((s.trip->>'party_size')::int,1),'booked','','[]'::jsonb) returning id into new_id;
  if s.plan is not null then
   insert into public.account_sync_snapshots(owner_id,scope,trip_id,payload) values(auth.uid(),'trip:'||new_id,new_id,s.plan);
  end if;
 end if;
 insert into public.trip_share_claims(share_id,user_id) values(s.id,auth.uid());
 update public.trip_shares set claims=claims+1 where id=s.id;
 return jsonb_build_object('kind',case when s.audience='planner' then 'client' else 'trip' end,'id',new_id,'plan',s.plan);
end $$;

create or replace function public.my_trip_shares(p_trip uuid default null)
 returns table(id uuid, trip_id uuid, audience text, claims integer, max_claims integer, expires_at timestamptz, revoked_at timestamptz, created_at timestamptz)
 language sql stable security definer set search_path to '' as $$
 select s.id,s.trip_id,s.audience,s.claims,s.max_claims,s.expires_at,s.revoked_at,s.created_at from public.trip_shares s
 where s.owner_id=auth.uid() and (p_trip is null or s.trip_id=p_trip) order by s.created_at desc limit 100 $$;

create or replace function public.stop_trip_share(p_share uuid)
 returns void language plpgsql security definer set search_path to '' as $$
begin
 update public.trip_shares set revoked_at=now() where id=p_share and owner_id=auth.uid() and revoked_at is null;
end $$;

-- Include share links in the user's own data export.
CREATE OR REPLACE FUNCTION public.export_my_account()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare who uuid:=auth.uid(); account_email text;
begin
 select email into account_email from auth.users where id=who and email_confirmed_at is not null;
 if account_email is null then raise exception 'Verified account required'; end if;
 return jsonb_build_object('schema',1,'exported_at',now(),'email',account_email,
 'trips',coalesce((select jsonb_agg(to_jsonb(t)-'owner_id') from public.account_trips t where t.owner_id=who),'[]'::jsonb),
 'planning_snapshots',coalesce((select jsonb_agg(to_jsonb(s)-'owner_id') from public.account_sync_snapshots s where s.owner_id=who),'[]'::jsonb),
 'notification_preferences',(select to_jsonb(p)-'owner_id' from public.account_notification_preferences p where p.owner_id=who),
 'notification_reads',coalesce((select jsonb_agg(to_jsonb(r)-'owner_id') from public.account_notification_reads r where r.owner_id=who),'[]'::jsonb),
 'received_announcements',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'trip_id',a.trip_id,'subject',a.subject,'body',a.body,'created_at',a.created_at)) from public.account_planner_announcements a join public.account_trips t on t.id=a.trip_id where a.owner_id=who and t.owner_id=who),'[]'::jsonb),
 'share_links',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'trip_id',s.trip_id,'audience',s.audience,'shared',s.trip,'claims',s.claims,'expires_at',s.expires_at,'revoked_at',s.revoked_at,'created_at',s.created_at)) from public.trip_shares s where s.owner_id=who),'[]'::jsonb),
 'deletion_requested_at',(select requested_at from public.account_deletion_requests where owner_id=who));
end; $function$;

revoke all on function public.friend_plan(jsonb) from public, anon, authenticated;
revoke all on function public.create_trip_share(uuid,text,jsonb,text) from public, anon;
grant execute on function public.create_trip_share(uuid,text,jsonb,text) to authenticated;
revoke all on function public.preview_trip_share(text) from public;
grant execute on function public.preview_trip_share(text) to anon, authenticated;
revoke all on function public.claim_trip_share(text) from public, anon;
grant execute on function public.claim_trip_share(text) to authenticated;
revoke all on function public.my_trip_shares(uuid) from public, anon;
grant execute on function public.my_trip_shares(uuid) to authenticated;
revoke all on function public.stop_trip_share(uuid) from public, anon;
grant execute on function public.stop_trip_share(uuid) to authenticated;
