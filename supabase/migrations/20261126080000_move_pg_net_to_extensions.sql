-- Supabase's security check wants pg_net outside the public schema. Its functions stay in the "net" schema either way.
do $$ begin
 if not exists(select 1 from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname = 'pg_net' and n.nspname = 'public') then return; end if;
 delete from public.wait_fetches;
 drop extension pg_net;
 create extension pg_net with schema extensions;
end $$;
