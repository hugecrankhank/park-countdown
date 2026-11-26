-- Updates on planner share links: the traveler can push a newer plan and a note to the planner who added them.
-- The planner's own client record (dates, reservations, notes) is left alone; only the traveler's shared plan refreshes.
alter table public.trip_share_claims add column client_id uuid references public.planner_clients(id) on delete set null;
create index trip_share_claims_client_idx on public.trip_share_claims(client_id);
alter table public.planner_clients add column traveler_note text not null default '' check (length(traveler_note) <= 500),
  add column traveler_updated_at timestamptz;

create or replace function public.claim_trip_share(p_token text)
 returns jsonb language plpgsql security definer set search_path to '' as $$
declare r jsonb;
begin
 r := public.claim_trip_share_core(p_token);
 update public.trip_share_claims c set trip_id = case when r->>'kind' = 'trip' then (r->>'id')::uuid end,
  client_id = case when r->>'kind' = 'client' then (r->>'id')::uuid end, seen_version = s.version
 from public.trip_shares s where s.id = c.share_id and c.user_id = auth.uid() and s.token_hash = encode(extensions.digest(p_token,'sha256'),'hex');
 return r;
end $$;

create or replace function public.push_trip_share_update(p_share uuid, p_plan jsonb default null, p_note text default '')
 returns integer language plpgsql security definer set search_path to '' as $$
declare s public.trip_shares%rowtype; t public.account_trips%rowtype; n integer;
begin
 if not public.has_plus() then raise exception 'PLUS_REQUIRED'; end if;
 select * into s from public.trip_shares where id = p_share and owner_id = auth.uid() for update;
 if not found or s.revoked_at is not null then raise exception 'This share link is not active'; end if;
 if p_plan is not null and (jsonb_typeof(p_plan) <> 'object' or coalesce(p_plan->>'schema','') <> '1' or octet_length(p_plan::text) > 1000000) then raise exception 'Day plans could not be sent'; end if;
 if s.updated_at > now() - interval '20 seconds' then raise exception 'Please wait a moment before sending another update'; end if;
 select * into t from public.account_trips where id = s.trip_id and owner_id = auth.uid();
 if not found then raise exception 'Trip not found'; end if;
 if s.audience = 'planner' then
  update public.trip_shares set version = version + 1, updated_at = now(), note = left(trim(coalesce(p_note,'')), 500), plan = coalesce(p_plan, plan) where id = s.id;
  update public.planner_clients pc set traveler_plan = coalesce(p_plan, pc.traveler_plan), traveler_note = left(trim(coalesce(p_note,'')), 500), traveler_updated_at = now()
   from public.trip_share_claims c where c.share_id = s.id and c.client_id = pc.id and pc.planner_id = c.user_id and pc.shared_by = auth.uid();
  get diagnostics n = row_count; return n;
 end if;
 update public.trip_shares set version = version + 1, updated_at = now(), note = left(trim(coalesce(p_note,'')), 500),
  trip = jsonb_build_object('title',t.title,'arrival',t.arrival,'departure',t.departure,'destination',t.destination,'resort',t.resort,'party_size',t.party_size),
  plan = coalesce(public.friend_plan(p_plan), plan) where id = s.id;
 return (select count(*)::int from public.trip_share_claims where share_id = s.id and trip_id is not null);
end $$;
