-- Picture backup: a private storage bucket where each account keeps its own uploaded pictures.
-- Anyone can read and delete their own files; adding files needs Plus. 1 MB per file, 600 files per account.
do $mig$ begin
 if to_regclass('storage.objects') is null then raise notice 'storage schema not present; skipping picture bucket'; return; end if;
 insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
  values ('pictures','pictures',false,1048576,array['image/jpeg','image/png','image/webp','application/json']) on conflict (id) do nothing;
 execute $p$create policy "pictures: read own" on storage.objects for select to authenticated
  using (bucket_id = 'pictures' and (storage.foldername(name))[1] = (select auth.uid())::text)$p$;
 execute $p$create policy "pictures: add own with Plus" on storage.objects for insert to authenticated
  with check (bucket_id = 'pictures' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.has_plus())
   and (select count(*) from storage.objects o where o.bucket_id = 'pictures' and (storage.foldername(o.name))[1] = (select auth.uid())::text) < 600)$p$;
 execute $p$create policy "pictures: replace own with Plus" on storage.objects for update to authenticated
  using (bucket_id = 'pictures' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'pictures' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.has_plus()))$p$;
 execute $p$create policy "pictures: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'pictures' and (storage.foldername(name))[1] = (select auth.uid())::text)$p$;
end $mig$;
