-- ============================================================================
-- Serupa — Row Level Security (PRD §9, §12). Jalankan SETELAH 02_functions.sql.
--
-- Prinsip:
--   theses            → semua user login boleh BACA; hanya admin MENULIS.
--   thesis_embeddings → hanya admin (service role bypass RLS untuk pencarian).
--   profiles          → user kelola profil sendiri; admin boleh baca semua.
--   scans/scan_results→ HANYA milik sendiri. Usulan mahasiswa = data sensitif
--                       (§12) sehingga admin pun tidak diberi akses baca di sini.
--   labels            → hanya admin (test set evaluasi, FA7).
-- ============================================================================

alter table public.theses            enable row level security;
alter table public.thesis_embeddings enable row level security;
alter table public.profiles          enable row level security;
alter table public.scans             enable row level security;
alter table public.scan_results      enable row level security;
alter table public.labels            enable row level security;

-- --- theses -----------------------------------------------------------------
drop policy if exists theses_read on public.theses;
create policy theses_read on public.theses
  for select to authenticated using (true);

drop policy if exists theses_admin_write on public.theses;
create policy theses_admin_write on public.theses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- --- thesis_embeddings (admin only; service role mem-bypass RLS) ------------
drop policy if exists embeddings_admin on public.thesis_embeddings;
create policy embeddings_admin on public.thesis_embeddings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- --- profiles ---------------------------------------------------------------
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- --- scans (pemilik saja) ---------------------------------------------------
drop policy if exists scans_owner on public.scans;
create policy scans_owner on public.scans
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- --- scan_results (lewat kepemilikan scan induk) ----------------------------
drop policy if exists scan_results_owner on public.scan_results;
create policy scan_results_owner on public.scan_results
  for all to authenticated
  using (exists (select 1 from public.scans s where s.id = scan_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.scans s where s.id = scan_id and s.user_id = auth.uid()));

-- --- labels (admin only) ----------------------------------------------------
drop policy if exists labels_admin on public.labels;
create policy labels_admin on public.labels
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
