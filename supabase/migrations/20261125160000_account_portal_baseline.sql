-- Baseline: park-countdown-v2 account portal (phases 1-8), captured from the live database.

set check_function_bodies = off;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

CREATE OR REPLACE FUNCTION public.collaboration_merge_value(b jsonb, t jsonb, p jsonb, label text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
begin
 if t is not distinct from b then return p; end if;
 if p is not distinct from b or t is not distinct from p then return t; end if;
 raise exception 'Conflicting change: %. Review your reservation or trip details before applying.',label;
end; $function$
;

CREATE OR REPLACE FUNCTION public.valid_trip_reservations(p jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare r jsonb; k text; v text; ids text[] := array[]::text[]; maxlen integer; n numeric; paid numeric;
begin
 if p is null or jsonb_typeof(p)<>'array' then return false; end if;
 if jsonb_array_length(p)>100 or octet_length(p::text)>400000 then return false; end if;
 for r in select value from jsonb_array_elements(p) loop
  if jsonb_typeof(r)<>'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(r))<>14 then return false; end if;
  foreach k in array array['id','kind','status','title','provider','location','confirmation','details','date','end_date','due_date','time'] loop
   if jsonb_typeof(r->k) is distinct from 'string' then return false; end if;
  end loop;
  if (r->>'id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or (r->>'id')=any(ids) then return false; end if;
  ids:=array_append(ids,r->>'id');
  if (r->>'kind') not in ('Resort / hotel','Flight','Ground transportation','Park tickets','Park day','Dining','Lightning Lane','Special event / excursion','Payment / invoice','Other') or (r->>'status') not in ('Planned','Confirmed','Completed','Cancelled') then return false; end if;
  if length(trim(r->>'title'))=0 then return false; end if;
  foreach k in array array['title','provider','location','confirmation','details'] loop
   maxlen:=case k when 'location' then 240 when 'confirmation' then 100 when 'details' then 2000 else 160 end;
   if length(r->>k)>maxlen then return false; end if;
  end loop;
  foreach k in array array['date','end_date','due_date'] loop
   v:=r->>k;
   if v<>'' then
    if v !~ '^\d{4}-\d{2}-\d{2}$' or left(v,4)='0000' then return false; end if;
    perform v::date;
   end if;
  end loop;
  if (r->>'end_date')<>'' and ((r->>'date')='' or (r->>'end_date')<(r->>'date')) then return false; end if;
  if (r->>'time')<>'' and ((r->>'date')='' or (r->>'time') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') then return false; end if;
  if jsonb_typeof(r->'cost_cents') is distinct from 'number' or jsonb_typeof(r->'paid_cents') is distinct from 'number' then return false; end if;
  n:=(r->>'cost_cents')::numeric; paid:=(r->>'paid_cents')::numeric;
  if n<>trunc(n) or paid<>trunc(paid) or n<0 or n>100000000 or paid<0 or paid>n then return false; end if;
 end loop;
 return true;
exception when others then return false;
end; $function$
;

create table public.account_deletion_requests (
  owner_id uuid not null,
  requested_at timestamp with time zone default now() not null
);

create table public.account_notification_preferences (
  owner_id uuid default auth.uid() not null,
  payments boolean default true not null,
  reservations boolean default true not null,
  preparation boolean default true not null,
  lead_days integer default 7 not null
);

create table public.account_notification_reads (
  owner_id uuid not null,
  notice_key text not null,
  read_at timestamp with time zone default now() not null
);

create table public.account_planner_announcements (
  id uuid default gen_random_uuid() not null,
  owner_id uuid not null,
  trip_id uuid not null,
  sender_id uuid,
  subject text not null,
  body text not null,
  created_at timestamp with time zone default now() not null
);

create table public.account_sync_snapshots (
  owner_id uuid default auth.uid() not null,
  scope text not null,
  trip_id uuid,
  payload jsonb not null,
  revision bigint default 1 not null,
  updated_at timestamp with time zone default now() not null
);

create table public.account_trips (
  id uuid default gen_random_uuid() not null,
  owner_id uuid default auth.uid() not null,
  title text not null,
  arrival date not null,
  departure date not null,
  resort text default ''::text not null,
  destination text default 'Walt Disney World'::text not null,
  party_size integer default 1 not null,
  status text default 'booked'::text not null,
  notes text default ''::text not null,
  created_at timestamp with time zone default now() not null,
  revision bigint default 1 not null,
  reservations jsonb default '[]'::jsonb not null
);

create table public.agency_members (
  agency_id uuid not null,
  user_id uuid not null,
  role text not null
);

create table public.customer_profiles (
  id uuid default gen_random_uuid() not null,
  planner_id uuid default auth.uid(),
  agency_id uuid,
  name text not null,
  email text not null,
  created_at timestamp with time zone default now() not null
);

create table public.planner_access (
  user_id uuid not null,
  approved_at timestamp with time zone default now() not null
);

create table public.planner_clients (
  id uuid default gen_random_uuid() not null,
  planner_id uuid default auth.uid(),
  client_name text not null,
  client_email text not null,
  title text not null,
  arrival date not null,
  departure date not null,
  resort text default ''::text not null,
  destination text default 'Walt Disney World'::text not null,
  party_size integer default 1 not null,
  notes text default ''::text not null,
  created_at timestamp with time zone default now() not null,
  reservations jsonb default '[]'::jsonb not null,
  revision bigint default 1 not null,
  agency_id uuid,
  customer_id uuid
);

create table public.travel_agencies (
  id uuid default gen_random_uuid() not null,
  name text not null,
  created_at timestamp with time zone default now() not null
);

create table public.trip_collaboration (
  client_id uuid not null,
  trip_id uuid not null,
  published_revision bigint not null,
  applied_revision bigint not null,
  published_snapshot jsonb not null,
  applied_snapshot jsonb not null,
  published_at timestamp with time zone default now() not null
);

create table public.trip_invites (
  id uuid default gen_random_uuid() not null,
  client_id uuid not null,
  token_hash text not null,
  expires_at timestamp with time zone not null,
  claimed_at timestamp with time zone,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone default now() not null
);

alter table public.account_deletion_requests add constraint account_deletion_requests_pkey PRIMARY KEY (owner_id);
alter table public.account_notification_preferences add constraint account_notification_preferences_pkey PRIMARY KEY (owner_id);
alter table public.account_notification_reads add constraint account_notification_reads_pkey PRIMARY KEY (owner_id, notice_key);
alter table public.account_planner_announcements add constraint account_planner_announcements_pkey PRIMARY KEY (id);
alter table public.account_sync_snapshots add constraint account_sync_snapshots_pkey PRIMARY KEY (owner_id, scope);
alter table public.account_trips add constraint account_trips_pkey PRIMARY KEY (id);
alter table public.agency_members add constraint agency_members_pkey PRIMARY KEY (agency_id, user_id);
alter table public.customer_profiles add constraint customer_profiles_pkey PRIMARY KEY (id);
alter table public.planner_access add constraint planner_access_pkey PRIMARY KEY (user_id);
alter table public.planner_clients add constraint planner_clients_pkey PRIMARY KEY (id);
alter table public.travel_agencies add constraint travel_agencies_pkey PRIMARY KEY (id);
alter table public.trip_collaboration add constraint trip_collaboration_trip_id_key UNIQUE (trip_id);
alter table public.trip_collaboration add constraint trip_collaboration_pkey PRIMARY KEY (client_id);
alter table public.trip_invites add constraint trip_invites_token_hash_key UNIQUE (token_hash);
alter table public.trip_invites add constraint trip_invites_pkey PRIMARY KEY (id);

alter table public.account_notification_preferences add constraint account_notification_preferences_lead_days_check CHECK ((lead_days = ANY (ARRAY[1, 3, 7, 14])));
alter table public.account_notification_reads add constraint account_notification_reads_notice_key_check CHECK (((char_length(notice_key) >= 1) AND (char_length(notice_key) <= 300)));
alter table public.account_planner_announcements add constraint account_planner_announcements_body_check CHECK (((char_length(TRIM(BOTH FROM body)) >= 1) AND (char_length(TRIM(BOTH FROM body)) <= 2000)));
alter table public.account_planner_announcements add constraint account_planner_announcements_subject_check CHECK (((char_length(TRIM(BOTH FROM subject)) >= 1) AND (char_length(TRIM(BOTH FROM subject)) <= 120)));
alter table public.account_sync_snapshots add constraint account_sync_snapshots_check CHECK ((((scope = 'profile'::text) AND (trip_id IS NULL)) OR ((trip_id IS NOT NULL) AND (scope = ('trip:'::text || (trip_id)::text)))));
alter table public.account_sync_snapshots add constraint account_sync_snapshots_payload_check CHECK (((jsonb_typeof(payload) = 'object'::text) AND (COALESCE((payload ->> 'schema'::text), ''::text) = '1'::text) AND (octet_length((payload)::text) <= 1048576)));
alter table public.account_sync_snapshots add constraint account_sync_snapshots_revision_check CHECK ((revision > 0));
alter table public.account_trips add constraint account_trip_reservation_shape CHECK (valid_trip_reservations(reservations));
alter table public.account_trips add constraint account_trips_check CHECK ((departure >= arrival));
alter table public.account_trips add constraint account_trips_destination_check CHECK ((length(destination) <= 160));
alter table public.account_trips add constraint account_trips_notes_check CHECK ((length(notes) <= 8000));
alter table public.account_trips add constraint account_trips_party_size_check CHECK (((party_size >= 1) AND (party_size <= 50)));
alter table public.account_trips add constraint account_trips_resort_check CHECK ((length(resort) <= 160));
alter table public.account_trips add constraint account_trips_status_check CHECK ((status = ANY (ARRAY['research'::text, 'booked'::text])));
alter table public.account_trips add constraint account_trips_title_check CHECK (((length(title) >= 1) AND (length(title) <= 160)));
alter table public.agency_members add constraint agency_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'planner'::text])));
alter table public.customer_profiles add constraint customer_profiles_check CHECK (((agency_id IS NOT NULL) OR (planner_id IS NOT NULL)));
alter table public.customer_profiles add constraint customer_profiles_email_check CHECK ((((length(email) >= 3) AND (length(email) <= 254)) AND (email = lower(TRIM(BOTH FROM email))) AND (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'::text)));
alter table public.customer_profiles add constraint customer_profiles_name_check CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 160)));
alter table public.planner_clients add constraint planner_client_scope_check CHECK ((((agency_id IS NULL) AND (planner_id IS NOT NULL)) OR ((agency_id IS NOT NULL) AND (planner_id IS NULL))));
alter table public.planner_clients add constraint planner_clients_check CHECK ((departure >= arrival));
alter table public.planner_clients add constraint planner_clients_client_email_check CHECK (((length(client_email) >= 3) AND (length(client_email) <= 254)));
alter table public.planner_clients add constraint planner_clients_client_name_check CHECK (((length(client_name) >= 1) AND (length(client_name) <= 160)));
alter table public.planner_clients add constraint planner_clients_destination_check CHECK ((length(destination) <= 160));
alter table public.planner_clients add constraint planner_clients_notes_check CHECK ((length(notes) <= 8000));
alter table public.planner_clients add constraint planner_clients_party_size_check CHECK (((party_size >= 1) AND (party_size <= 50)));
alter table public.planner_clients add constraint planner_clients_resort_check CHECK ((length(resort) <= 160));
alter table public.planner_clients add constraint planner_clients_title_check CHECK (((length(title) >= 1) AND (length(title) <= 160)));
alter table public.planner_clients add constraint planner_trip_reservation_shape CHECK (valid_trip_reservations(reservations));
alter table public.travel_agencies add constraint travel_agencies_name_check CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 160)));
alter table public.trip_collaboration add constraint trip_collaboration_check CHECK ((applied_revision <= published_revision));

alter table public.account_deletion_requests add constraint account_deletion_requests_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.account_notification_preferences add constraint account_notification_preferences_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.account_notification_reads add constraint account_notification_reads_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.account_planner_announcements add constraint account_planner_announcements_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.account_planner_announcements add constraint account_planner_announcements_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.account_planner_announcements add constraint account_planner_announcements_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES account_trips(id) ON DELETE CASCADE;
alter table public.account_sync_snapshots add constraint account_sync_snapshots_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.account_sync_snapshots add constraint account_sync_snapshots_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES account_trips(id) ON DELETE CASCADE;
alter table public.account_trips add constraint account_trips_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.agency_members add constraint agency_members_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES travel_agencies(id) ON DELETE CASCADE;
alter table public.agency_members add constraint agency_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.customer_profiles add constraint customer_profiles_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES travel_agencies(id) ON DELETE CASCADE;
alter table public.customer_profiles add constraint customer_profiles_planner_id_fkey FOREIGN KEY (planner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.planner_access add constraint planner_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.planner_clients add constraint planner_clients_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES travel_agencies(id) ON DELETE RESTRICT;
alter table public.planner_clients add constraint planner_clients_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE SET NULL;
alter table public.planner_clients add constraint planner_clients_planner_id_fkey FOREIGN KEY (planner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.trip_collaboration add constraint trip_collaboration_client_id_fkey FOREIGN KEY (client_id) REFERENCES planner_clients(id) ON DELETE CASCADE;
alter table public.trip_collaboration add constraint trip_collaboration_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES account_trips(id) ON DELETE CASCADE;
alter table public.trip_invites add constraint trip_invites_client_id_fkey FOREIGN KEY (client_id) REFERENCES planner_clients(id) ON DELETE CASCADE;

CREATE INDEX announcement_recipient_idx ON public.account_planner_announcements USING btree (owner_id, created_at DESC);
CREATE INDEX announcement_sender_idx ON public.account_planner_announcements USING btree (sender_id);
CREATE INDEX announcement_trip_idx ON public.account_planner_announcements USING btree (trip_id, created_at DESC);
CREATE INDEX account_sync_snapshots_trip_idx ON public.account_sync_snapshots USING btree (trip_id);
CREATE INDEX account_trips_owner_idx ON public.account_trips USING btree (owner_id);
CREATE INDEX agency_members_user_idx ON public.agency_members USING btree (user_id);
CREATE UNIQUE INDEX customer_agency_email ON public.customer_profiles USING btree (agency_id, email) WHERE (agency_id IS NOT NULL);
CREATE UNIQUE INDEX customer_private_email ON public.customer_profiles USING btree (planner_id, email) WHERE (agency_id IS NULL);
CREATE INDEX planner_clients_agency ON public.planner_clients USING btree (agency_id);
CREATE INDEX planner_clients_customer ON public.planner_clients USING btree (customer_id);
CREATE INDEX planner_clients_planner_idx ON public.planner_clients USING btree (planner_id);
CREATE INDEX trip_invites_client_idx ON public.trip_invites USING btree (client_id);

CREATE OR REPLACE FUNCTION public.add_agency_planner(p_agency uuid, p_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare target uuid;
begin
 if not public.agency_member(p_agency,true) then raise exception 'Agency administrator required'; end if;
 select u.id into target from auth.users u join public.planner_access p on p.user_id=u.id where lower(u.email)=lower(trim(p_email)) and u.email_confirmed_at is not null;
 if target is null then raise exception 'A verified, approved planner account is required'; end if;
 insert into public.agency_members values(p_agency,target,'planner') on conflict do nothing;
end; $function$
;

CREATE OR REPLACE FUNCTION public.agency_member(p_agency uuid, p_admin boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.agency_members m join public.planner_access p on p.user_id=m.user_id where m.agency_id=p_agency and m.user_id=auth.uid() and (not p_admin or m.role='admin'));
$function$
;

CREATE OR REPLACE FUNCTION public.agency_team(p_agency uuid)
 RETURNS TABLE(user_id uuid, email text, role text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if not public.agency_member(p_agency,true) then raise exception 'Agency administrator required'; end if;
 return query select m.user_id,u.email::text,m.role from public.agency_members m join auth.users u on u.id=m.user_id where m.agency_id=p_agency order by m.role,u.email;
end; $function$
;

CREATE OR REPLACE FUNCTION public.apply_client_update(p_trip uuid, p_revision bigint, p_published bigint)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare l public.trip_collaboration%rowtype; t public.account_trips%rowtype; b jsonb; p jsonb; cur jsonb; result jsonb:='{}'; items jsonb:='[]'; k text; rid text; merged jsonb; new_revision bigint;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 -- Lock only the authorized target trip; a guessed foreign trip cannot be updated.
 select * into t from public.account_trips where id=p_trip and owner_id=auth.uid() for update;
 if not found then raise exception 'Trip unavailable'; end if;
 select * into l from public.trip_collaboration where trip_id=t.id for update;
 if not found or not exists(select 1 from public.my_collaboration_updates() a where a.trip_id=t.id) then raise exception 'Planner connection unavailable'; end if;
 if t.revision is distinct from p_revision or l.published_revision is distinct from p_published then raise exception 'Trip or planner update changed; reopen review'; end if;
 if l.published_revision=l.applied_revision then return t.revision; end if;
 b:=l.applied_snapshot; p:=l.published_snapshot; cur:=to_jsonb(t);
 foreach k in array array['title','arrival','departure','resort','destination','party_size','notes'] loop
  result:=result||jsonb_build_object(k,public.collaboration_merge_value(b->k,cur->k,p->k,k));
 end loop;
 for rid in select distinct value->>'id' from jsonb_array_elements((cur->'reservations')||(p->'reservations')||(b->'reservations')) order by 1 loop
  merged:=public.collaboration_merge_value(
   (select value from jsonb_array_elements(b->'reservations') where value->>'id'=rid),
   (select value from jsonb_array_elements(cur->'reservations') where value->>'id'=rid),
   (select value from jsonb_array_elements(p->'reservations') where value->>'id'=rid), 'reservation '||rid);
  if merged is not null then items:=items||jsonb_build_array(merged); end if;
 end loop;
 -- Existing database constraints validate the merged record; everything is atomic.
 update public.account_trips set title=result->>'title',arrival=(result->>'arrival')::date,departure=(result->>'departure')::date,resort=result->>'resort',destination=result->>'destination',party_size=(result->>'party_size')::int,notes=result->>'notes',reservations=items where id=t.id returning revision into new_revision;
 update public.trip_collaboration set applied_revision=l.published_revision,applied_snapshot=l.published_snapshot where trip_id=t.id;
 return new_revision;
end; $function$
;

CREATE OR REPLACE FUNCTION public.bump_account_trip_revision()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin new.revision := old.revision + 1; return new; end; $function$
;

CREATE OR REPLACE FUNCTION public.bump_sync_snapshot()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin new.revision:=old.revision+1; new.updated_at:=now(); return new; end; $function$
;

CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 delete from public.account_deletion_requests where owner_id=auth.uid();
end; $function$
;

CREATE OR REPLACE FUNCTION public.claim_trip_invite(p_token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare i public.trip_invites%rowtype; c public.planner_clients%rowtype; email_verified text; new_id uuid; target_client uuid; snap jsonb;
begin
 if auth.uid() is null or p_token is null or p_token !~ '^[a-f0-9]{48}$' then raise exception 'Invalid invitation'; end if;
 select lower(email) into email_verified from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if email_verified is null then raise exception 'Confirm your email first'; end if;
 select client_id into target_client from public.trip_invites where token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
 if not found then raise exception 'Invitation unavailable'; end if;
 -- Same lock ordering as issue/revoke: client then invitation.
 select * into c from public.planner_clients where id=target_client for update;
 if not found or lower(trim(c.client_email))<>email_verified or not public.planner_scope_active(c.planner_id,c.agency_id) then raise exception 'Invitation unavailable or email does not match'; end if;
 select * into i from public.trip_invites where client_id=c.id and token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
 if not found or i.claimed_at is not null or i.revoked_at is not null or i.expires_at<=now() then raise exception 'Invitation expired, used or revoked'; end if;
 if exists(select 1 from public.trip_collaboration where client_id=c.id) then raise exception 'This client trip is already connected'; end if;
 insert into public.account_trips(owner_id,title,arrival,departure,resort,destination,party_size,status,notes,reservations) values(auth.uid(),c.title,c.arrival,c.departure,c.resort,c.destination,c.party_size,'booked',c.notes,c.reservations) returning id into new_id;
 snap:=public.collaboration_snapshot(c);
 insert into public.trip_collaboration(client_id,trip_id,published_revision,applied_revision,published_snapshot,applied_snapshot) values(c.id,new_id,c.revision,c.revision,snap,snap);
 update public.trip_invites set claimed_at=now() where id=i.id;
 return new_id;
end; $function$
;

CREATE OR REPLACE FUNCTION public.collaboration_snapshot(c planner_clients)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 select jsonb_build_object('title',c.title,'arrival',c.arrival,'departure',c.departure,'resort',c.resort,'destination',c.destination,'party_size',c.party_size,'notes',c.notes,'reservations',c.reservations);
$function$
;

CREATE OR REPLACE FUNCTION public.create_travel_agency(p_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare a uuid;
begin
 if not exists(select 1 from public.planner_access where user_id=auth.uid()) then raise exception 'Approved planner required'; end if;
 insert into public.travel_agencies(name) values(trim(p_name)) returning id into a;
 insert into public.agency_members values(a,auth.uid(),'admin'); return a;
end; $function$
;

CREATE OR REPLACE FUNCTION public.disconnect_client_update(p_trip uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 perform 1 from public.account_trips where id=p_trip and owner_id=auth.uid() for update;
 if not found then raise exception 'Trip unavailable'; end if;
 delete from public.trip_collaboration where trip_id=p_trip;
end; $function$
;

CREATE OR REPLACE FUNCTION public.disconnect_planner_client(p_client uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 perform 1 from public.planner_clients where id=p_client and public.planner_scope(planner_id,agency_id) for update;
 if not found or not exists(select 1 from public.planner_access where user_id=auth.uid()) then raise exception 'Planner access required'; end if;
 delete from public.trip_collaboration where client_id=p_client;
end; $function$
;

CREATE OR REPLACE FUNCTION public.edit_customer_profile(p_id uuid, p_name text, p_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 update public.customer_profiles set name=trim(p_name),email=lower(trim(p_email)) where id=p_id and public.planner_scope(planner_id,agency_id);
 if not found then raise exception 'Customer unavailable'; end if;
end; $function$
;

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
 'deletion_requested_at',(select requested_at from public.account_deletion_requests where owner_id=who));
end; $function$
;

CREATE OR REPLACE FUNCTION public.import_customer_profiles(p_agency uuid, p_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r jsonb; added int:=0; n int;
begin
 if not public.planner_scope(auth.uid(),p_agency) then raise exception 'Workspace access required'; end if;
 if jsonb_typeof(p_rows) is distinct from 'array' or octet_length(p_rows::text)>300000 then raise exception 'Invalid customer data'; end if;
 if jsonb_array_length(p_rows) not between 1 and 500 then raise exception 'Import 1 to 500 customer rows'; end if;
 for r in select value from jsonb_array_elements(p_rows) loop
  if jsonb_typeof(r) is distinct from 'object' or jsonb_typeof(r->'name') is distinct from 'string' or jsonb_typeof(r->'email') is distinct from 'string' then raise exception 'Name and email required'; end if;
  insert into public.customer_profiles(planner_id,agency_id,name,email) values(case when p_agency is null then auth.uid() else null end,p_agency,trim(r->>'name'),lower(trim(r->>'email'))) on conflict do nothing;
  get diagnostics n=row_count; added:=added+n;
 end loop;
 return jsonb_build_object('added',added,'skipped',jsonb_array_length(p_rows)-added);
end; $function$
;

CREATE OR REPLACE FUNCTION public.issue_trip_invite(p_client uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare raw_token text; c public.planner_clients%rowtype;
begin
 select * into c from public.planner_clients where id=p_client and public.planner_scope(planner_id,agency_id) for update;
 if not found or not exists(select 1 from public.planner_access where user_id=auth.uid()) then raise exception 'Planner access required'; end if;
 if exists(select 1 from public.trip_collaboration where client_id=c.id) then raise exception 'This trip is already connected; publish changes instead'; end if;
 update public.trip_invites set revoked_at=now() where client_id=p_client and claimed_at is null and revoked_at is null;
 raw_token:=encode(extensions.gen_random_bytes(24),'hex');
 insert into public.trip_invites(client_id,token_hash,expires_at) values(p_client,encode(extensions.digest(raw_token,'sha256'),'hex'),now()+interval '7 days');
 return raw_token;
end; $function$
;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_key text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_key is null or char_length(p_key) not between 1 and 300 or p_key !~ '^(message|update|payment|booking|prep|arrival):' then raise exception 'Invalid notification key'; end if;
 -- Serialize marks per account and bound the stored read history. Older keys may reappear unread.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,717));
 insert into public.account_notification_reads(owner_id,notice_key) values(auth.uid(),p_key) on conflict do nothing;
 delete from public.account_notification_reads where owner_id=auth.uid() and notice_key in
 (select notice_key from public.account_notification_reads where owner_id=auth.uid() order by read_at desc,notice_key offset 2000);
end; $function$
;

CREATE OR REPLACE FUNCTION public.my_collaboration_updates()
 RETURNS TABLE(trip_id uuid, published_revision bigint, applied_revision bigint, published_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select l.trip_id,l.published_revision,l.applied_revision,l.published_at from public.trip_collaboration l join public.account_trips t on t.id=l.trip_id join public.planner_clients c on c.id=l.client_id join auth.users u on u.id=t.owner_id where t.owner_id=auth.uid() and public.planner_scope_active(c.planner_id,c.agency_id) and u.email_confirmed_at is not null and lower(u.email)=lower(trim(c.client_email));
$function$
;

CREATE OR REPLACE FUNCTION public.planner_collaboration_status()
 RETURNS TABLE(client_id uuid, published_revision bigint, applied_revision bigint, published_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null or not exists(select 1 from public.planner_access where user_id=auth.uid()) then raise exception 'Planner access required'; end if;
 return query select l.client_id,l.published_revision,l.applied_revision,l.published_at from public.trip_collaboration l join public.planner_clients c on c.id=l.client_id where public.planner_scope(c.planner_id,c.agency_id);
end; $function$
;

CREATE OR REPLACE FUNCTION public.planner_invite_status()
 RETURNS TABLE(client_id uuid, status text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null or not exists(select 1 from public.planner_access p where p.user_id=auth.uid()) then raise exception 'Planner access required'; end if;
 return query select c.id,
 case when i.claimed_at is not null then 'claimed' when i.revoked_at is not null then 'revoked' when i.expires_at<=now() then 'expired' else 'pending' end,
 i.expires_at
 from public.planner_clients c
 cross join lateral (select x.claimed_at,x.revoked_at,x.expires_at from public.trip_invites x where x.client_id=c.id order by x.created_at desc,x.id desc limit 1) i
 where public.planner_scope(c.planner_id,c.agency_id);
end; $function$
;

CREATE OR REPLACE FUNCTION public.planner_scope(p_planner uuid, p_agency uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.planner_access where user_id=auth.uid()) and case when p_agency is null then coalesce(p_planner=auth.uid(),false) else public.agency_member(p_agency) end;
$function$
;

CREATE OR REPLACE FUNCTION public.planner_scope_active(p_planner uuid, p_agency uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select case when p_agency is null then exists(select 1 from public.planner_access where user_id=p_planner) else exists(select 1 from public.agency_members m join public.planner_access p on p.user_id=m.user_id where m.agency_id=p_agency) end;
$function$
;

CREATE OR REPLACE FUNCTION public.publish_client_update(p_client uuid, p_revision bigint)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c public.planner_clients%rowtype; l public.trip_collaboration%rowtype;
begin
 select * into c from public.planner_clients where id=p_client and public.planner_scope(planner_id,agency_id) for update;
 if not found or not exists(select 1 from public.planner_access where user_id=auth.uid()) then raise exception 'Planner access required'; end if;
 if c.revision is distinct from p_revision then raise exception 'Client changed; reload before publishing'; end if;
 select * into l from public.trip_collaboration where client_id=c.id for update;
 if not found then raise exception 'No connected traveler'; end if;
 if not exists(select 1 from public.account_trips t join auth.users u on u.id=t.owner_id where t.id=l.trip_id and u.email_confirmed_at is not null and lower(u.email)=lower(trim(c.client_email))) then raise exception 'Connected account email no longer matches; disconnect before issuing a new invitation'; end if;
 if c.revision<=l.published_revision then return l.published_revision; end if;
 update public.trip_collaboration set published_snapshot=public.collaboration_snapshot(c),published_revision=c.revision,published_at=now() where client_id=c.id;
 return c.revision;
end; $function$
;

CREATE OR REPLACE FUNCTION public.remove_agency_planner(p_agency uuid, p_user uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if not public.agency_member(p_agency,true) then raise exception 'Agency administrator required'; end if;
 if p_user=auth.uid() then raise exception 'Cannot remove yourself'; end if;
 delete from public.agency_members where agency_id=p_agency and user_id=p_user and role='planner';
end; $function$
;

CREATE OR REPLACE FUNCTION public.request_account_deletion()
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result timestamptz;
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'Verified account required'; end if;
 insert into public.account_deletion_requests(owner_id) values(auth.uid()) on conflict(owner_id) do nothing;
 select requested_at into result from public.account_deletion_requests where owner_id=auth.uid();
 return result;
end; $function$
;

CREATE OR REPLACE FUNCTION public.review_client_update(p_trip uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select jsonb_build_object('published_revision',l.published_revision,'applied_revision',l.applied_revision,'published_at',l.published_at,'snapshot',l.published_snapshot,'baseline',l.applied_snapshot) from public.trip_collaboration l join public.my_collaboration_updates() a on a.trip_id=l.trip_id where l.trip_id=p_trip;
$function$
;

CREATE OR REPLACE FUNCTION public.revoke_trip_invite(p_client uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 perform 1 from public.planner_clients where id=p_client and public.planner_scope(planner_id,agency_id) for update;
 if not found or not exists(select 1 from public.planner_access where user_id=auth.uid()) then raise exception 'Planner access required'; end if;
 update public.trip_invites set revoked_at=now() where client_id=p_client and claimed_at is null and revoked_at is null;
end; $function$
;

CREATE OR REPLACE FUNCTION public.save_notification_preferences(p_payments boolean, p_reservations boolean, p_preparation boolean, p_lead_days integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 insert into public.account_notification_preferences(owner_id,payments,reservations,preparation,lead_days)
 values(auth.uid(),p_payments,p_reservations,p_preparation,p_lead_days)
 on conflict(owner_id) do update set payments=excluded.payments,reservations=excluded.reservations,preparation=excluded.preparation,lead_days=excluded.lead_days;
end; $function$
;

CREATE OR REPLACE FUNCTION public.send_planner_announcement(p_client uuid, p_subject text, p_body text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c public.planner_clients%rowtype; l public.trip_collaboration%rowtype; recipient uuid; result_id uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select * into c from public.planner_clients where id=p_client and public.planner_scope(planner_id,agency_id) for update;
 if not found then raise exception 'Planner access required'; end if;
 select * into l from public.trip_collaboration where client_id=c.id for update;
 if not found then raise exception 'No connected traveler'; end if;
 select t.owner_id into recipient from public.account_trips t join auth.users u on u.id=t.owner_id
 where t.id=l.trip_id and u.email_confirmed_at is not null and lower(u.email)=lower(trim(c.client_email));
 if not found then raise exception 'Connected account email no longer matches'; end if;
 if p_subject is null or p_body is null or char_length(trim(p_subject)) not between 1 and 120 or char_length(trim(p_body)) not between 1 and 2000 then raise exception 'Enter a subject and message within the length limits'; end if;
 if (select count(*) from public.account_planner_announcements where trip_id=l.trip_id and created_at>now()-interval '1 hour')>=10 then raise exception 'Message limit reached; try again later'; end if;
 insert into public.account_planner_announcements(owner_id,trip_id,sender_id,subject,body) values(recipient,l.trip_id,auth.uid(),trim(p_subject),trim(p_body)) returning id into result_id;
 return result_id;
end; $function$
;

CREATE OR REPLACE FUNCTION public.validate_new_customer_link()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if new.customer_id is not null and not exists(select 1 from public.customer_profiles p where p.id=new.customer_id and p.agency_id is not distinct from new.agency_id and (new.agency_id is not null or p.planner_id=new.planner_id) and p.email=lower(trim(new.client_email))) then raise exception 'Customer must belong to this workspace and match the invitation email'; end if;
 if new.agency_id is not null then new.planner_id:=null; end if;
 return new;
end; $function$
;

CREATE TRIGGER account_trip_revision BEFORE UPDATE ON public.account_trips FOR EACH ROW EXECUTE FUNCTION bump_account_trip_revision();
CREATE TRIGGER planner_customer_link BEFORE INSERT ON public.planner_clients FOR EACH ROW EXECUTE FUNCTION validate_new_customer_link();
CREATE TRIGGER planner_trip_revision BEFORE UPDATE ON public.planner_clients FOR EACH ROW EXECUTE FUNCTION bump_account_trip_revision();
CREATE TRIGGER sync_snapshot_revision BEFORE UPDATE ON public.account_sync_snapshots FOR EACH ROW EXECUTE FUNCTION bump_sync_snapshot();

alter table public.account_deletion_requests enable row level security;
alter table public.account_notification_preferences enable row level security;
alter table public.account_notification_reads enable row level security;
alter table public.account_planner_announcements enable row level security;
alter table public.account_sync_snapshots enable row level security;
alter table public.account_trips enable row level security;
alter table public.agency_members enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.planner_access enable row level security;
alter table public.planner_clients enable row level security;
alter table public.travel_agencies enable row level security;
alter table public.trip_collaboration enable row level security;
alter table public.trip_invites enable row level security;

create policy own_deletion_request on public.account_deletion_requests for SELECT to authenticated
  using ((owner_id = ( SELECT auth.uid() AS uid)));
create policy own_notification_preferences on public.account_notification_preferences for SELECT to authenticated
  using ((owner_id = ( SELECT auth.uid() AS uid)));
create policy own_notification_reads on public.account_notification_reads for SELECT to authenticated
  using ((owner_id = ( SELECT auth.uid() AS uid)));
create policy own_planner_announcements on public.account_planner_announcements for SELECT to authenticated
  using (((owner_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM account_trips t
  WHERE ((t.id = account_planner_announcements.trip_id) AND (t.owner_id = ( SELECT auth.uid() AS uid)))))));
create policy own_sync_snapshots on public.account_sync_snapshots for ALL to authenticated
  using (((owner_id = ( SELECT auth.uid() AS uid)) AND ((trip_id IS NULL) OR (EXISTS ( SELECT 1
   FROM account_trips t
  WHERE ((t.id = account_sync_snapshots.trip_id) AND (t.owner_id = ( SELECT auth.uid() AS uid))))))))
  with check (((owner_id = ( SELECT auth.uid() AS uid)) AND ((trip_id IS NULL) OR (EXISTS ( SELECT 1
   FROM account_trips t
  WHERE ((t.id = account_sync_snapshots.trip_id) AND (t.owner_id = ( SELECT auth.uid() AS uid))))))));
create policy own_trips on public.account_trips for ALL to authenticated
  using ((owner_id = ( SELECT auth.uid() AS uid)))
  with check ((owner_id = ( SELECT auth.uid() AS uid)));
create policy membership_read on public.agency_members for SELECT to authenticated
  using ((agency_member(agency_id) AND ((user_id = ( SELECT auth.uid() AS uid)) OR agency_member(agency_id, true))));
create policy customer_read on public.customer_profiles for SELECT to authenticated
  using (planner_scope(planner_id, agency_id));
create policy own_planner_role on public.planner_access for SELECT to authenticated
  using ((user_id = ( SELECT auth.uid() AS uid)));
create policy scoped_clients on public.planner_clients for ALL to authenticated
  using (planner_scope(planner_id, agency_id))
  with check (planner_scope(planner_id, agency_id));
create policy agency_read on public.travel_agencies for SELECT to authenticated
  using (agency_member(id));

revoke all on all tables in schema public from anon, authenticated;

grant SELECT on public.account_deletion_requests to authenticated;
grant SELECT on public.account_notification_preferences to authenticated;
grant SELECT on public.account_notification_reads to authenticated;
grant SELECT on public.account_sync_snapshots to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on public.account_trips to authenticated;
grant SELECT on public.agency_members to authenticated;
grant SELECT on public.customer_profiles to authenticated;
grant SELECT on public.planner_access to authenticated;
grant DELETE, SELECT on public.planner_clients to authenticated;
grant SELECT on public.travel_agencies to authenticated;

grant INSERT (payload, scope, trip_id) on public.account_sync_snapshots to authenticated;
grant UPDATE (payload) on public.account_sync_snapshots to authenticated;
grant SELECT (body, created_at, id, owner_id, subject, trip_id) on public.account_planner_announcements to authenticated;
grant INSERT (agency_id, arrival, client_email, client_name, customer_id, departure, destination, notes, party_size, reservations, resort, title) on public.planner_clients to authenticated;
grant UPDATE (arrival, client_email, client_name, departure, destination, notes, party_size, reservations, resort, title) on public.planner_clients to authenticated;

revoke all on function public.add_agency_planner(p_agency uuid, p_email text) from public, anon;
grant execute on function public.add_agency_planner(p_agency uuid, p_email text) to authenticated;
revoke all on function public.agency_member(p_agency uuid, p_admin boolean) from public, anon;
grant execute on function public.agency_member(p_agency uuid, p_admin boolean) to authenticated;
revoke all on function public.agency_team(p_agency uuid) from public, anon;
grant execute on function public.agency_team(p_agency uuid) to authenticated;
revoke all on function public.apply_client_update(p_trip uuid, p_revision bigint, p_published bigint) from public, anon;
grant execute on function public.apply_client_update(p_trip uuid, p_revision bigint, p_published bigint) to authenticated;
revoke all on function public.bump_account_trip_revision() from public, anon;
revoke all on function public.bump_sync_snapshot() from public, anon;
revoke all on function public.cancel_account_deletion() from public, anon;
grant execute on function public.cancel_account_deletion() to authenticated;
revoke all on function public.claim_trip_invite(p_token text) from public, anon;
grant execute on function public.claim_trip_invite(p_token text) to authenticated;
revoke all on function public.collaboration_merge_value(b jsonb, t jsonb, p jsonb, label text) from public, anon;
revoke all on function public.collaboration_snapshot(c planner_clients) from public, anon;
revoke all on function public.create_travel_agency(p_name text) from public, anon;
grant execute on function public.create_travel_agency(p_name text) to authenticated;
revoke all on function public.disconnect_client_update(p_trip uuid) from public, anon;
grant execute on function public.disconnect_client_update(p_trip uuid) to authenticated;
revoke all on function public.disconnect_planner_client(p_client uuid) from public, anon;
grant execute on function public.disconnect_planner_client(p_client uuid) to authenticated;
revoke all on function public.edit_customer_profile(p_id uuid, p_name text, p_email text) from public, anon;
grant execute on function public.edit_customer_profile(p_id uuid, p_name text, p_email text) to authenticated;
revoke all on function public.export_my_account() from public, anon;
grant execute on function public.export_my_account() to authenticated;
revoke all on function public.import_customer_profiles(p_agency uuid, p_rows jsonb) from public, anon;
grant execute on function public.import_customer_profiles(p_agency uuid, p_rows jsonb) to authenticated;
revoke all on function public.issue_trip_invite(p_client uuid) from public, anon;
grant execute on function public.issue_trip_invite(p_client uuid) to authenticated;
revoke all on function public.mark_notification_read(p_key text) from public, anon;
grant execute on function public.mark_notification_read(p_key text) to authenticated;
revoke all on function public.my_collaboration_updates() from public, anon;
grant execute on function public.my_collaboration_updates() to authenticated;
revoke all on function public.planner_collaboration_status() from public, anon;
grant execute on function public.planner_collaboration_status() to authenticated;
revoke all on function public.planner_invite_status() from public, anon;
grant execute on function public.planner_invite_status() to authenticated;
revoke all on function public.planner_scope(p_planner uuid, p_agency uuid) from public, anon;
grant execute on function public.planner_scope(p_planner uuid, p_agency uuid) to authenticated;
revoke all on function public.planner_scope_active(p_planner uuid, p_agency uuid) from public, anon;
revoke all on function public.publish_client_update(p_client uuid, p_revision bigint) from public, anon;
grant execute on function public.publish_client_update(p_client uuid, p_revision bigint) to authenticated;
revoke all on function public.remove_agency_planner(p_agency uuid, p_user uuid) from public, anon;
grant execute on function public.remove_agency_planner(p_agency uuid, p_user uuid) to authenticated;
revoke all on function public.request_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;
revoke all on function public.review_client_update(p_trip uuid) from public, anon;
grant execute on function public.review_client_update(p_trip uuid) to authenticated;
revoke all on function public.revoke_trip_invite(p_client uuid) from public, anon;
grant execute on function public.revoke_trip_invite(p_client uuid) to authenticated;
revoke all on function public.save_notification_preferences(p_payments boolean, p_reservations boolean, p_preparation boolean, p_lead_days integer) from public, anon;
grant execute on function public.save_notification_preferences(p_payments boolean, p_reservations boolean, p_preparation boolean, p_lead_days integer) to authenticated;
revoke all on function public.send_planner_announcement(p_client uuid, p_subject text, p_body text) from public, anon;
grant execute on function public.send_planner_announcement(p_client uuid, p_subject text, p_body text) to authenticated;
revoke all on function public.valid_trip_reservations(p jsonb) from public, anon;
grant execute on function public.valid_trip_reservations(p jsonb) to authenticated;
revoke all on function public.validate_new_customer_link() from public, anon;
