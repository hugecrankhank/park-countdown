-- Smart wait-time predictions.
-- Every 15 minutes pg_cron asks pg_net to fetch posted standby waits for each Disney resort from ThemeParks.wiki.
-- The next run folds finished responses into a compact profile per ride x weekday x half hour
-- (exponentially weighted, so recent weeks count more). No personal data is stored.

-- (Wrapped so the local test database, which lacks these extensions, can use stand-ins.)
do $$ begin create extension if not exists pg_net; exception when others then raise notice 'pg_net unavailable: %', sqlerrm; end $$;
do $$ begin create extension if not exists pg_cron; exception when others then raise notice 'pg_cron unavailable: %', sqlerrm; end $$;

create table public.wait_destinations (
  dest_id text primary key,
  name text not null,
  active boolean not null default true
);
insert into public.wait_destinations(dest_id,name) values
 ('e957da41-3552-4cf6-b636-5babc5cbc4e5','Walt Disney World'),
 ('bfc89fd6-314d-44b4-b89e-df1a89cf991e','Disneyland Resort'),
 ('e8d0207f-da8a-4048-bec8-117aa946b2c2','Disneyland Paris'),
 ('faff60df-c766-4470-8adb-dee78e813f42','Tokyo Disney Resort'),
 ('6e1464ca-1e9b-49c3-8937-c5c6f6675057','Shanghai Disney Resort'),
 ('abcfffe7-01f2-4f92-ae61-5093346f5a68','Hong Kong Disneyland');

create table public.wait_rides (
  ride_id text primary key,
  park_id text not null,
  dest_id text not null references public.wait_destinations(dest_id) on delete cascade,
  name text not null,
  updated_at timestamptz not null default now()
);
create index wait_rides_park_idx on public.wait_rides(park_id);
create index wait_rides_dest_idx on public.wait_rides(dest_id);

create table public.wait_profile (
  ride_id text not null references public.wait_rides(ride_id) on delete cascade,
  dow smallint not null check (dow between 0 and 6),        -- 0 = Sunday, park local time
  slot smallint not null check (slot between 0 and 47),     -- half hour of the park's local day
  n integer not null,
  mean real not null,
  var real not null default 0,
  updated_at timestamptz not null default now(),
  primary key (ride_id, dow, slot)
);

create table public.wait_daily (
  ride_id text not null references public.wait_rides(ride_id) on delete cascade,
  day date not null,
  n integer not null,
  mean real not null,
  peak smallint not null,
  primary key (ride_id, day)
);
create index wait_daily_day_idx on public.wait_daily(day);

create table public.wait_fetches (
  request_id bigint primary key,
  dest_id text not null references public.wait_destinations(dest_id) on delete cascade,
  requested_at timestamptz not null default now()
);
create index wait_fetches_dest_idx on public.wait_fetches(dest_id);

alter table public.wait_destinations enable row level security;
alter table public.wait_rides enable row level security;
alter table public.wait_profile enable row level security;
alter table public.wait_daily enable row level security;
alter table public.wait_fetches enable row level security;
revoke all on public.wait_destinations, public.wait_rides, public.wait_profile, public.wait_daily, public.wait_fetches from anon, authenticated;

-- Fold one ThemeParks.wiki live response into the profile. Separate from the fetching so it can be tested.
create or replace function public.wait_ingest(p_dest text, p_at timestamptz, p_body jsonb)
 returns integer language plpgsql security definer set search_path to '' as $$
declare tz text := coalesce(p_body->>'timezone','America/New_York'); loc timestamp; d smallint; s smallint; lday date; x jsonb; w int; cnt int := 0;
begin
 if p_body is null or jsonb_typeof(p_body->'liveData')<>'array' then return 0; end if;
 begin loc := p_at at time zone tz; exception when others then loc := p_at at time zone 'UTC'; end;
 d := extract(dow from loc)::smallint; s := (extract(hour from loc)*2 + floor(extract(minute from loc)/30))::smallint; lday := loc::date;
 for x in select * from jsonb_array_elements(p_body->'liveData') loop
  continue when x->>'entityType' is distinct from 'ATTRACTION' or x->>'status' is distinct from 'OPERATING' or x->>'id' is null or x->>'parkId' is null;
  continue when jsonb_typeof(x#>'{queue,STANDBY,waitTime}') is distinct from 'number';
  w := least(greatest((x#>>'{queue,STANDBY,waitTime}')::numeric,0),600)::int;
  insert into public.wait_rides(ride_id,park_id,dest_id,name,updated_at) values(x->>'id',x->>'parkId',p_dest,left(coalesce(x->>'name','Attraction'),200),now())
   on conflict (ride_id) do update set name=excluded.name, park_id=excluded.park_id, updated_at=now();
  insert into public.wait_profile as p(ride_id,dow,slot,n,mean,var,updated_at) values(x->>'id',d,s,1,w,0,now())
   on conflict (ride_id,dow,slot) do update set
    n = p.n+1,
    mean = p.mean + greatest(1.0/(p.n+1),0.1)*(excluded.mean-p.mean),
    var = (1-greatest(1.0/(p.n+1),0.1))*(p.var + greatest(1.0/(p.n+1),0.1)*(excluded.mean-p.mean)^2),
    updated_at = now();
  insert into public.wait_daily as y(ride_id,day,n,mean,peak) values(x->>'id',lday,1,w,w)
   on conflict (ride_id,day) do update set n=y.n+1, mean=y.mean+(excluded.mean-y.mean)/(y.n+1), peak=greatest(y.peak,excluded.peak);
  cnt := cnt+1;
 end loop;
 return cnt;
end $$;

-- Cron entry point: ingest finished responses, then request fresh data.
create or replace function public.wait_collect()
 returns void language plpgsql security definer set search_path to '' as $$
declare f record; body jsonb;
begin
 for f in select w.request_id, w.dest_id, w.requested_at, r.status_code, r.content from public.wait_fetches w join net._http_response r on r.id=w.request_id loop
  if f.status_code=200 then
   begin body := f.content::jsonb; perform public.wait_ingest(f.dest_id, f.requested_at, body);
   exception when others then null; end;
  end if;
  delete from public.wait_fetches where request_id=f.request_id;
 end loop;
 delete from public.wait_fetches where requested_at < now()-interval '2 hours';
 delete from public.wait_daily where day < current_date-400;
 insert into public.wait_fetches(request_id,dest_id)
  select net.http_get(url := 'https://api.themeparks.wiki/v1/entity/'||dest_id||'/live', timeout_milliseconds := 30000), dest_id
  from public.wait_destinations where active;
end $$;

-- Predicted posted wait for every ride in a park, by half hour, for a given date.
create or replace function public.predict_waits(p_park text, p_date date)
 returns table(ride_id text, name text, slot smallint, wait integer, spread integer, samples integer, days integer)
 language sql stable security definer set search_path to '' as $$
 with dw as (select extract(dow from p_date)::smallint as d),
 rides as (select r.ride_id, r.name from public.wait_rides r where r.park_id=p_park),
 same as (select p.ride_id,p.slot,p.mean,p.var,p.n from public.wait_profile p join rides using(ride_id), dw where p.dow=dw.d),
 allp as (select p.ride_id,p.slot,sum(p.mean*p.n)/sum(p.n) as mean,sum(p.var*p.n)/sum(p.n) as var,sum(p.n)::int as n from public.wait_profile p join rides using(ride_id) group by p.ride_id,p.slot),
 fac as (select p.ride_id, avg(p.mean) filter (where p.dow=(select d from dw)) / nullif(avg(p.mean),0) as f from public.wait_profile p join rides using(ride_id) group by p.ride_id),
 days as (select y.ride_id, count(*)::int as days from public.wait_daily y join rides using(ride_id) group by y.ride_id)
 select a.ride_id, r.name, a.slot,
  (round(case when s.n>=2 then s.mean else a.mean*coalesce(least(greatest(fac.f,0.5),2),1) end / 5.0)*5)::int,
  round(sqrt(greatest(case when s.n>=2 then s.var else a.var end,0)))::int,
  coalesce(s.n,0)+a.n, coalesce(days.days,0)
 from allp a join rides r using(ride_id) left join same s using(ride_id,slot) left join fac using(ride_id) left join days using(ride_id)
 order by r.name, a.slot $$;

-- Which days have been collected for a resort (so the app can adjust for crowd levels) and since when.
create or replace function public.wait_prediction_status(p_dest text)
 returns jsonb language sql stable security definer set search_path to '' as $$
 select jsonb_build_object('first_day',min(y.day),'days',count(distinct y.day),'sampled_days',coalesce(jsonb_agg(distinct y.day),'[]'::jsonb))
 from public.wait_daily y join public.wait_rides r using(ride_id) where r.dest_id=p_dest $$;

revoke all on function public.wait_ingest(text,timestamptz,jsonb) from public, anon, authenticated;
revoke all on function public.wait_collect() from public, anon, authenticated;
revoke all on function public.predict_waits(text,date) from public;
grant execute on function public.predict_waits(text,date) to anon, authenticated;
revoke all on function public.wait_prediction_status(text) from public;
grant execute on function public.wait_prediction_status(text) to anon, authenticated;

select cron.schedule('collect-wait-times','*/15 * * * *','select public.wait_collect()');
