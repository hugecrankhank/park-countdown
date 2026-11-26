-- Upgrade to travel planner: travelers request access, an app administrator approves or declines in the app.
-- The request is also emailed: the requester's mail app opens addressed to the administrator.

create table public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);

create table public.planner_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 160),
  business text not null default '' check (length(business) <= 160),
  phone text not null default '' check (length(phone) <= 40),
  website text not null default '' check (length(website) <= 300),
  message text not null default '' check (length(message) <= 2000),
  status text not null default 'pending' check (status in ('pending','approved','declined','withdrawn')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null
);
create index planner_requests_user_idx on public.planner_requests(user_id);
create index planner_requests_decided_by_idx on public.planner_requests(decided_by);
create unique index planner_requests_one_pending on public.planner_requests(user_id) where status = 'pending';

alter table public.app_admins enable row level security;
alter table public.planner_requests enable row level security;
revoke all on public.app_admins, public.planner_requests from anon, authenticated;

create or replace function public.is_app_admin()
 returns boolean language sql stable security definer set search_path to '' as $$
 select exists(select 1 from public.app_admins where user_id = auth.uid()) $$;

-- Returns the request plus where to email it.
create or replace function public.request_planner_upgrade(p_name text, p_business text default '', p_phone text default '', p_website text default '', p_message text default '')
 returns jsonb language plpgsql security definer set search_path to '' as $$
declare me text; r public.planner_requests%rowtype; admin_email text;
begin
 select email into me from auth.users where id = auth.uid() and email_confirmed_at is not null;
 if me is null then raise exception 'Confirm your email first'; end if;
 if exists(select 1 from public.planner_access where user_id = auth.uid()) then raise exception 'Your account already has travel planner access'; end if;
 if (select count(*) from public.planner_requests where user_id = auth.uid() and created_at > now() - interval '1 day') >= 3 then raise exception 'Too many requests today. Please try again tomorrow.'; end if;
 update public.planner_requests set status = 'withdrawn', decided_at = now() where user_id = auth.uid() and status = 'pending';
 insert into public.planner_requests(user_id, name, business, phone, website, message)
 values (auth.uid(), trim(p_name), left(trim(coalesce(p_business,'')),160), left(trim(coalesce(p_phone,'')),40), left(trim(coalesce(p_website,'')),300), left(trim(coalesce(p_message,'')),2000))
 returning * into r;
 select u.email into admin_email from public.app_admins a join auth.users u on u.id = a.user_id order by a.added_at limit 1;
 return jsonb_build_object('id', r.id, 'status', r.status, 'created_at', r.created_at, 'email', me, 'admin_email', admin_email);
end $$;

create or replace function public.my_planner_request()
 returns jsonb language sql stable security definer set search_path to '' as $$
 select to_jsonb(x) from (select id, status, name, business, created_at, decided_at from public.planner_requests
  where user_id = auth.uid() order by created_at desc limit 1) x $$;

create or replace function public.withdraw_planner_request()
 returns void language sql security definer set search_path to '' as $$
 update public.planner_requests set status = 'withdrawn', decided_at = now() where user_id = auth.uid() and status = 'pending' $$;

create or replace function public.planner_requests_for_admin(p_all boolean default false)
 returns table(id uuid, email text, name text, business text, phone text, website text, message text, status text, created_at timestamptz, decided_at timestamptz)
 language plpgsql stable security definer set search_path to '' as $$
begin
 if not public.is_app_admin() then raise exception 'Administrator access required'; end if;
 return query select r.id, u.email::text, r.name, r.business, r.phone, r.website, r.message, r.status, r.created_at, r.decided_at
  from public.planner_requests r join auth.users u on u.id = r.user_id
  where p_all or r.status = 'pending' order by r.created_at desc limit 200;
end $$;

create or replace function public.decide_planner_request(p_request uuid, p_approve boolean)
 returns void language plpgsql security definer set search_path to '' as $$
declare r public.planner_requests%rowtype;
begin
 if not public.is_app_admin() then raise exception 'Administrator access required'; end if;
 select * into r from public.planner_requests where id = p_request for update;
 if not found or r.status <> 'pending' then raise exception 'This request was already handled'; end if;
 update public.planner_requests set status = case when p_approve then 'approved' else 'declined' end, decided_at = now(), decided_by = auth.uid() where id = r.id;
 if p_approve then insert into public.planner_access(user_id) values (r.user_id) on conflict do nothing; end if;
end $$;

revoke all on function public.is_app_admin() from public, anon;
grant execute on function public.is_app_admin() to authenticated;
revoke all on function public.request_planner_upgrade(text,text,text,text,text) from public, anon;
grant execute on function public.request_planner_upgrade(text,text,text,text,text) to authenticated;
revoke all on function public.my_planner_request() from public, anon;
grant execute on function public.my_planner_request() to authenticated;
revoke all on function public.withdraw_planner_request() from public, anon;
grant execute on function public.withdraw_planner_request() to authenticated;
revoke all on function public.planner_requests_for_admin(boolean) from public, anon;
grant execute on function public.planner_requests_for_admin(boolean) to authenticated;
revoke all on function public.decide_planner_request(uuid,boolean) from public, anon;
grant execute on function public.decide_planner_request(uuid,boolean) to authenticated;
