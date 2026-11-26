-- Account tiers (Free / Plus / Planner Pro) and live updates for shared trips.
-- Plus comes from: an administrator grant, the open beta, a future payment, being an approved planner,
-- or being the client of a planner. Paid features are locked here on the server, not only in the app.

create table public.account_tiers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'plus' check (tier in ('plus')),
  source text not null check (source in ('admin','beta','stripe','trip_pass')),
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
create table public.app_settings (key text primary key, value jsonb not null);
insert into public.app_settings(key, value) values ('beta_plus_open', 'true'::jsonb);
alter table public.account_tiers enable row level security;
alter table public.app_settings enable row level security;
revoke all on public.account_tiers, public.app_settings from anon, authenticated;

create or replace function public.has_plus()
 returns boolean language sql stable security definer set search_path to '' as $$
 select auth.uid() is not null and (
  exists(select 1 from public.planner_access where user_id = auth.uid())
  or exists(select 1 from public.account_tiers where user_id = auth.uid() and (expires_at is null or expires_at > now()))
  or exists(select 1 from public.trip_collaboration c join public.account_trips t on t.id = c.trip_id where t.owner_id = auth.uid())) $$;

create or replace function public.my_tier()
 returns jsonb language sql stable security definer set search_path to '' as $$
 select jsonb_build_object(
  'tier', case when exists(select 1 from public.planner_access where user_id = auth.uid()) then 'planner' when public.has_plus() then 'plus' else 'free' end,
  'via', case when exists(select 1 from public.planner_access where user_id = auth.uid()) then 'planner'
              when exists(select 1 from public.account_tiers where user_id = auth.uid() and (expires_at is null or expires_at > now())) then (select source from public.account_tiers where user_id = auth.uid())
              when public.has_plus() then 'planner_client' else null end,
  'expires_at', (select expires_at from public.account_tiers where user_id = auth.uid() and (expires_at is null or expires_at > now())),
  'beta_open', coalesce((select value = 'true'::jsonb from public.app_settings where key = 'beta_plus_open'), false),
  'admin', exists(select 1 from public.app_admins where user_id = auth.uid())) $$;

-- While payments are not live, anyone with a confirmed account can switch Plus on for 30 days at a time.
create or replace function public.start_beta_plus()
 returns jsonb language plpgsql security definer set search_path to '' as $$
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null) then raise exception 'Confirm your email first'; end if;
 if not coalesce((select value = 'true'::jsonb from public.app_settings where key = 'beta_plus_open'), false) then raise exception 'The free beta has ended'; end if;
 insert into public.account_tiers(user_id, source, expires_at) values (auth.uid(), 'beta', now() + interval '30 days')
 on conflict (user_id) do update set expires_at = now() + interval '30 days', updated_at = now() where public.account_tiers.source = 'beta';
 return public.my_tier();
end $$;

create or replace function public.admin_accounts()
 returns table(user_id uuid, email text, tier text, via text, expires_at timestamptz, joined timestamptz, trips integer)
 language plpgsql stable security definer set search_path to '' as $$
begin
 if not public.is_app_admin() then raise exception 'Administrator access required'; end if;
 return query select u.id, u.email::text,
  case when p.user_id is not null then 'planner' when a.user_id is not null then 'plus' else 'free' end,
  case when p.user_id is not null then 'planner' else a.source end, a.expires_at, u.created_at,
  (select count(*)::int from public.account_trips t where t.owner_id = u.id)
  from auth.users u left join public.planner_access p on p.user_id = u.id
  left join public.account_tiers a on a.user_id = u.id and (a.expires_at is null or a.expires_at > now())
  order by u.created_at desc limit 500;
end $$;

-- p_days: null = no end date, 0 = remove Plus, otherwise that many days from now.
create or replace function public.admin_set_plus(p_user uuid, p_days integer default null)
 returns void language plpgsql security definer set search_path to '' as $$
begin
 if not public.is_app_admin() then raise exception 'Administrator access required'; end if;
 if p_days = 0 then delete from public.account_tiers where user_id = p_user; return; end if;
 insert into public.account_tiers(user_id, source, expires_at) values (p_user, 'admin', case when p_days is null then null else now() + make_interval(days => p_days) end)
 on conflict (user_id) do update set source = 'admin', expires_at = excluded.expires_at, updated_at = now();
end $$;

create or replace function public.admin_set_planner(p_user uuid, p_on boolean)
 returns void language plpgsql security definer set search_path to '' as $$
begin
 if not public.is_app_admin() then raise exception 'Administrator access required'; end if;
 if p_on then insert into public.planner_access(user_id) values (p_user) on conflict do nothing;
 else if p_user = auth.uid() then raise exception 'You cannot remove your own planner access here'; end if; delete from public.planner_access where user_id = p_user; end if;
end $$;

create or replace function public.admin_set_beta(p_open boolean)
 returns void language plpgsql security definer set search_path to '' as $$
begin
 if not public.is_app_admin() then raise exception 'Administrator access required'; end if;
 update public.app_settings set value = to_jsonb(p_open) where key = 'beta_plus_open';
end $$;

-- Lock paid features: smart wait predictions and sending a trip. The originals become internal.
alter function public.predict_waits(text, date) rename to predict_waits_core;
revoke all on function public.predict_waits_core(text, date) from public, anon, authenticated;
create function public.predict_waits(p_park text, p_date date)
 returns table(ride_id text, name text, slot smallint, wait integer, spread integer, samples integer, days integer)
 language plpgsql stable security definer set search_path to '' as $$
begin
 if not public.has_plus() then raise exception 'PLUS_REQUIRED'; end if;
 return query select * from public.predict_waits_core(p_park, p_date);
end $$;

alter function public.create_trip_share(uuid, text, jsonb, text) rename to create_trip_share_core;
revoke all on function public.create_trip_share_core(uuid, text, jsonb, text) from public, anon, authenticated;
create function public.create_trip_share(p_trip uuid, p_audience text, p_plan jsonb default null, p_sender_name text default '')
 returns text language plpgsql security definer set search_path to '' as $$
begin
 if not public.has_plus() then raise exception 'PLUS_REQUIRED'; end if;
 return public.create_trip_share_core(p_trip, p_audience, p_plan, p_sender_name);
end $$;

-- Live updates: the sender can push a newer plan and a short note to everyone who added the trip.
alter table public.trip_shares add column version integer not null default 1,
  add column note text not null default '' check (length(note) <= 500), add column updated_at timestamptz;
alter table public.trip_share_claims add column trip_id uuid references public.account_trips(id) on delete set null,
  add column seen_version integer not null default 1;
create index trip_share_claims_trip_idx on public.trip_share_claims(trip_id);

alter function public.claim_trip_share(text) rename to claim_trip_share_core;
revoke all on function public.claim_trip_share_core(text) from public, anon, authenticated;
create function public.claim_trip_share(p_token text)
 returns jsonb language plpgsql security definer set search_path to '' as $$
declare r jsonb;
begin
 r := public.claim_trip_share_core(p_token);
 if r->>'kind' = 'trip' then
  update public.trip_share_claims c set trip_id = (r->>'id')::uuid, seen_version = s.version
  from public.trip_shares s where s.id = c.share_id and c.user_id = auth.uid() and s.token_hash = encode(extensions.digest(p_token,'sha256'),'hex');
 end if;
 return r;
end $$;

create or replace function public.push_trip_share_update(p_share uuid, p_plan jsonb default null, p_note text default '')
 returns integer language plpgsql security definer set search_path to '' as $$
declare s public.trip_shares%rowtype; t public.account_trips%rowtype;
begin
 if not public.has_plus() then raise exception 'PLUS_REQUIRED'; end if;
 select * into s from public.trip_shares where id = p_share and owner_id = auth.uid() for update;
 if not found or s.revoked_at is not null then raise exception 'This share link is not active'; end if;
 if s.audience <> 'friend' then raise exception 'Updates are for friends & family links'; end if;
 if p_plan is not null and (jsonb_typeof(p_plan) <> 'object' or coalesce(p_plan->>'schema','') <> '1' or octet_length(p_plan::text) > 1000000) then raise exception 'Day plans could not be sent'; end if;
 if s.updated_at > now() - interval '20 seconds' then raise exception 'Please wait a moment before sending another update'; end if;
 select * into t from public.account_trips where id = s.trip_id and owner_id = auth.uid();
 if not found then raise exception 'Trip not found'; end if;
 update public.trip_shares set version = version + 1, updated_at = now(), note = left(trim(coalesce(p_note,'')), 500),
  trip = jsonb_build_object('title',t.title,'arrival',t.arrival,'departure',t.departure,'destination',t.destination,'resort',t.resort,'party_size',t.party_size),
  plan = coalesce(public.friend_plan(p_plan), plan) where id = s.id;
 return (select count(*)::int from public.trip_share_claims where share_id = s.id and trip_id is not null);
end $$;

create or replace function public.my_share_updates()
 returns table(trip_id uuid, sender text, title text, note text, updated_at timestamptz)
 language sql stable security definer set search_path to '' as $$
 select c.trip_id, s.sender_name, s.trip->>'title', s.note, s.updated_at from public.trip_share_claims c join public.trip_shares s on s.id = c.share_id
 where c.user_id = auth.uid() and c.trip_id is not null and s.version > c.seen_version and s.revoked_at is null $$;

-- p_apply false = dismiss without changing the trip.
create or replace function public.apply_share_update(p_trip uuid, p_apply boolean default true)
 returns jsonb language plpgsql security definer set search_path to '' as $$
declare s public.trip_shares%rowtype;
begin
 select s2.* into s from public.trip_share_claims c join public.trip_shares s2 on s2.id = c.share_id
  where c.user_id = auth.uid() and c.trip_id = p_trip and s2.revoked_at is null and s2.version > c.seen_version;
 if not found then raise exception 'No update is waiting for this trip'; end if;
 if p_apply then
  update public.account_trips set title = s.trip->>'title', arrival = (s.trip->>'arrival')::date, departure = (s.trip->>'departure')::date,
   resort = coalesce(s.trip->>'resort',''), destination = coalesce(s.trip->>'destination', destination), party_size = coalesce((s.trip->>'party_size')::int, party_size)
   where id = p_trip and owner_id = auth.uid();
  if not found then raise exception 'Trip not found'; end if;
  if s.plan is not null then
   insert into public.account_sync_snapshots(owner_id, scope, trip_id, payload) values (auth.uid(), 'trip:'||p_trip, p_trip, s.plan)
   on conflict (owner_id, scope) do update set payload = excluded.payload;
  end if;
 end if;
 update public.trip_share_claims c set seen_version = s.version where c.share_id = s.id and c.user_id = auth.uid();
 return jsonb_build_object('applied', p_apply, 'plan', case when p_apply then s.plan else null end);
end $$;

do $$ declare f text; begin
 foreach f in array array['has_plus()','my_tier()','start_beta_plus()','admin_accounts()','admin_set_plus(uuid,integer)','admin_set_planner(uuid,boolean)','admin_set_beta(boolean)',
  'predict_waits(text,date)','create_trip_share(uuid,text,jsonb,text)','claim_trip_share(text)','push_trip_share_update(uuid,jsonb,text)','my_share_updates()','apply_share_update(uuid,boolean)'] loop
  execute format('revoke all on function public.%s from public, anon', f);
  execute format('grant execute on function public.%s to authenticated', f);
 end loop; end $$;
