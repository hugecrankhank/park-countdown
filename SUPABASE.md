# Accounts database (Supabase)

Project: **park-countdown-v2** (`cwlkhlpzxmojrxgvhcou`). The site reads its address and publishable key from the Cloudflare build variables `PARK_SUPABASE_URL` and `PARK_SUPABASE_PUBLISHABLE_KEY`. Never put a secret or service-role key there.

## What's in this folder

- `supabase/migrations/20261125160000_account_portal_baseline.sql`: the whole database for phases 1–8 (13 tables, 32 functions, access rules and permissions), captured from the live project. Running it in a new, empty Supabase project's SQL editor recreates everything.
- `supabase/migrations/20261125225400_rls_initplan_and_fk_indexes.sql`: a speed-up applied on Nov 25 (same rules, checked once per query; indexes for linked tables). Already included in the live project.
- `supabase/tests_security.sql`: checks that travelers can't see each other's trips, strangers can't use invitations, planners only see their own clients, and planner updates and messages reach the right traveler. Run it with `PGTEST_URL=... ./run-tests.sh` against an empty local Postgres.

From now on, put each database change in a new dated file in `supabase/migrations/` as well as applying it, so the repo always matches the live database.

## Everyday admin

**Approve a travel planner.** Planners sign up like anyone else, then you approve them in the SQL editor:

```sql
insert into public.planner_access (user_id)
select id from auth.users where lower(email) = lower('planner@example.com') and email_confirmed_at is not null;
```

Remove approval with `delete from public.planner_access where user_id = ...`.

**Handle account deletion requests.** Travelers request deletion in Account settings; nothing is deleted automatically. To see pending requests:

```sql
select r.requested_at, u.email from public.account_deletion_requests r join auth.users u on u.id = r.owner_id order by 1;
```

To complete one, delete the user in **Authentication → Users**. Their trips, sync data, notifications and requests are removed with them. Agency-owned client records stay with the agency.

## Before inviting real customers

1. **Authentication → URL Configuration:** Site URL `https://park-countdown-v2.pages.dev` and the same address under Redirect URLs (plus your final domain later). Email links break without this.
2. **Authentication → Emails → SMTP Settings:** set up your own email sender. Supabase's built-in sender is for testing only: it only delivers to your own team's addresses and sends just a few emails per hour.
3. **Authentication → Providers → Email:** keep "Confirm email" on. Invitations and planner messages rely on verified emails.
4. **Leaked password protection** (Authentication → Policies) blocks passwords known from data breaches. It requires a paid Supabase plan.
