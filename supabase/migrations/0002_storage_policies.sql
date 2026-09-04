-- Politiques Storage pour le bucket privé "imports" (créé séparément via la
-- Supabase CLI ou le dashboard — voir docs/SETUP.md).
--
-- L'app uploade directement le fichier de ciblage depuis le client avec le JWT
-- utilisateur, sous le chemin "<sector_id>/<horodatage>-<nom_fichier>". On
-- n'autorise l'upload/lecture/suppression que sur les secteurs accessibles à
-- l'utilisateur connecté, en réutilisant has_sector_access() défini dans
-- 0001_init.sql.

create policy "imports bucket: upload dans ses secteurs"
  on storage.objects for insert
  with check (
    bucket_id = 'imports'
    and has_sector_access(((storage.foldername(name))[1])::uuid)
  );

create policy "imports bucket: lecture dans ses secteurs"
  on storage.objects for select
  using (
    bucket_id = 'imports'
    and has_sector_access(((storage.foldername(name))[1])::uuid)
  );

create policy "imports bucket: suppression dans ses secteurs"
  on storage.objects for delete
  using (
    bucket_id = 'imports'
    and has_sector_access(((storage.foldername(name))[1])::uuid)
  );
