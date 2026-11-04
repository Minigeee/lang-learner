-- The private bucket holds content and media. Signups are off, so a signed-in user is the owner.
-- Writes use a Storage key that never reaches the browser, so there's no write policy.
create policy "signed-in users read the private bucket"
  on storage.objects for select to authenticated
  using (bucket_id = 'private');
