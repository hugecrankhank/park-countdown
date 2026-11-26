-- minimal Supabase stand-ins
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$; do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
create schema auth;
create table auth.users(id uuid primary key default gen_random_uuid(), email text, email_confirmed_at timestamptz, encrypted_password text, raw_app_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
grant usage on schema auth, public to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;

-- stand-ins for pg_net and pg_cron
create schema if not exists net;
create table if not exists net._http_response(id bigint primary key, status_code int, content text, created timestamptz default now());
create sequence if not exists net.req_seq;
create or replace function net.http_get(url text, timeout_milliseconds int default 5000) returns bigint language sql as $$ select nextval('net.req_seq') $$;
create schema if not exists cron;
create or replace function cron.schedule(name text, sched text, cmd text) returns bigint language sql as $$ select 1::bigint $$;
