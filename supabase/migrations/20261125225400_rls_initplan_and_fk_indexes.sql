-- Same access rules, evaluated once per query instead of once per row; plus indexes for foreign keys.
-- (The baseline file already contains the updated policies; this file records the change for history.)
alter policy own_deletion_request on public.account_deletion_requests using (owner_id = (select auth.uid()));
alter policy own_notification_preferences on public.account_notification_preferences using (owner_id = (select auth.uid()));
alter policy own_notification_reads on public.account_notification_reads using (owner_id = (select auth.uid()));
alter policy own_planner_announcements on public.account_planner_announcements
  using (owner_id = (select auth.uid()) and exists (select 1 from public.account_trips t where t.id = account_planner_announcements.trip_id and t.owner_id = (select auth.uid())));
alter policy own_sync_snapshots on public.account_sync_snapshots
  using (owner_id = (select auth.uid()) and (trip_id is null or exists (select 1 from public.account_trips t where t.id = account_sync_snapshots.trip_id and t.owner_id = (select auth.uid()))))
  with check (owner_id = (select auth.uid()) and (trip_id is null or exists (select 1 from public.account_trips t where t.id = account_sync_snapshots.trip_id and t.owner_id = (select auth.uid()))));
alter policy own_trips on public.account_trips using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
alter policy membership_read on public.agency_members using (public.agency_member(agency_id) and (user_id = (select auth.uid()) or public.agency_member(agency_id, true)));
alter policy own_planner_role on public.planner_access using (user_id = (select auth.uid()));

create index if not exists account_trips_owner_idx on public.account_trips (owner_id);
create index if not exists account_sync_snapshots_trip_idx on public.account_sync_snapshots (trip_id);
create index if not exists announcement_sender_idx on public.account_planner_announcements (sender_id);
create index if not exists agency_members_user_idx on public.agency_members (user_id);
create index if not exists planner_clients_planner_idx on public.planner_clients (planner_id);
create index if not exists trip_invites_client_idx on public.trip_invites (client_id);
