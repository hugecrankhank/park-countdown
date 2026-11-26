-- Food ratings: signed-in travelers give each restaurant 1-5 stars; everyone sees the average.
-- Stars only (no public text), so there is nothing to moderate. Table is function-only.

create table public.restaurant_ratings (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  restaurant_id text not null check (length(restaurant_id) between 1 and 80),
  dest_id text not null check (length(dest_id) between 1 and 80),
  stars smallint not null check (stars between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);
create index restaurant_ratings_dest_idx on public.restaurant_ratings(dest_id, restaurant_id);
alter table public.restaurant_ratings enable row level security;
revoke all on public.restaurant_ratings from anon, authenticated;

create or replace function public.restaurant_ratings_for(p_dest text)
 returns table(restaurant_id text, average numeric, votes integer, mine smallint)
 language sql stable security definer set search_path to '' as $$
 select r.restaurant_id, round(avg(r.stars)::numeric, 1), count(*)::int, max(r.stars) filter (where r.user_id = auth.uid())::smallint
 from public.restaurant_ratings r where r.dest_id = p_dest group by r.restaurant_id $$;

-- p_stars 1-5 saves the rating; 0 or null removes it.
create or replace function public.rate_restaurant(p_dest text, p_restaurant text, p_stars integer)
 returns void language plpgsql security definer set search_path to '' as $$
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null) then raise exception 'Sign in to rate'; end if;
 if coalesce(p_stars, 0) = 0 then delete from public.restaurant_ratings where user_id = auth.uid() and restaurant_id = p_restaurant; return; end if;
 if p_stars not between 1 and 5 then raise exception 'Choose 1 to 5 stars'; end if;
 if (select count(*) from public.restaurant_ratings where user_id = auth.uid()) >= 3000 then raise exception 'Too many ratings'; end if;
 insert into public.restaurant_ratings(user_id, restaurant_id, dest_id, stars) values (auth.uid(), p_restaurant, p_dest, p_stars)
 on conflict (user_id, restaurant_id) do update set stars = excluded.stars, dest_id = excluded.dest_id, updated_at = now();
end $$;

revoke all on function public.restaurant_ratings_for(text) from public;
grant execute on function public.restaurant_ratings_for(text) to anon, authenticated;
revoke all on function public.rate_restaurant(text,text,integer) from public, anon;
grant execute on function public.rate_restaurant(text,text,integer) to authenticated;

-- Include the person's ratings in their data export.
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
 'restaurant_ratings',coalesce((select jsonb_agg(jsonb_build_object('restaurant_id',r.restaurant_id,'dest_id',r.dest_id,'stars',r.stars,'updated_at',r.updated_at)) from public.restaurant_ratings r where r.user_id=who),'[]'::jsonb),
 'deletion_requested_at',(select requested_at from public.account_deletion_requests where owner_id=who));
end; $function$;
