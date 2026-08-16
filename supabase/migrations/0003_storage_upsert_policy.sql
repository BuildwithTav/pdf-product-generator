-- The PDF export route uploads with { upsert: true } so re-exporting a
-- project overwrites its previous PDF instead of erroring on a duplicate
-- path. Postgres RLS requires an UPDATE policy to permit the upsert's
-- conflict-resolution branch (even when no conflict actually occurs at
-- runtime) — 0001 only ever granted SELECT and INSERT on this bucket.
create policy "generated-pdfs: owner update"
  on storage.objects for update
  using (bucket_id = 'generated-pdfs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'generated-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);
