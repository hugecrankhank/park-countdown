-- Planner client records: fuller contact details. Park days and dining use the existing reservations list
-- (kinds 'Park day' and 'Dining'), so they also show in Reservations & payments and reach the client's app.
alter table public.planner_clients
  add column client_phone text not null default '' check (length(client_phone) <= 40),
  add column client_address text not null default '' check (length(client_address) <= 300),
  add column travelers text not null default '' check (length(travelers) <= 1000);
grant insert (client_phone, client_address, travelers) on public.planner_clients to authenticated;
grant update (client_phone, client_address, travelers) on public.planner_clients to authenticated;
