-- schema.sql — Supabase (Postgres + pgvector) — VERSI FINAL
-- Selaras dengan CLAUDE.md + perbaikan Supabase Security Advisor:
--   (1) view theses_map  -> security_invoker (bukan SECURITY DEFINER)
--   (2) match_titles     -> search_path dipatok (tidak "mutable")
--   (3) extension vector -> schema 'extensions' (bukan 'public')
-- Data: title, abstract, year + kolom turunan (embedding, x/y, cluster, cluster_label).
-- Satu jurusan (keperawatan); TIDAK ada prodi/penulis.
--
-- Catatan: 'security_invoker' butuh Postgres 15+ (default project Supabase baru).

-- 1) Extension vektor — di schema khusus 'extensions' (rekomendasi Supabase).
create schema if not exists extensions;
create extension if not exists vector with schema extensions;

-- 2) Tabel korpus
create table if not exists public.theses (
  id            bigint generated always as identity primary key,
  title         text not null,
  abstract      text,
  year          int,
  embedding     vector(384),    -- dari JUDUL (pencarian judul-vs-judul)
  x             real,           -- koordinat 2D (UMAP atas embedding judul) untuk peta
  y             real,
  cluster       int,            -- id klaster topik (KMeans atas embedding judul)
  cluster_label text,           -- kata kunci tema (TF-IDF atas ABSTRAK anggota klaster)
  created_at    timestamptz default now()
);

-- 3) Fungsi pencarian top-k. '<=>' = cosine distance; similarity = 1 - distance.
--    search_path DIPATOK -> hindari "role mutable search_path" (Security Advisor).
--    'public, extensions' aman baik 'vector' di public maupun di extensions.
create or replace function public.match_titles(query_embedding vector(384), match_count int default 10)
returns table (id bigint, title text, abstract text, year int, similarity float)
language sql stable
set search_path = public, extensions
as $$
  select t.id, t.title, t.abstract, t.year,
         1 - (t.embedding <=> query_embedding) as similarity
  from public.theses t
  order by t.embedding <=> query_embedding
  limit match_count;
$$;

-- 4) View ringan untuk peta (TANPA embedding & abstract). security_invoker -> view
--    memakai izin & RLS PEMANGGIL (anon), bukan pemilik view.
create or replace view public.theses_map
  with (security_invoker = true) as
  select id, title, year, x, y, cluster, cluster_label from public.theses;

-- 5) Keamanan: RLS + grant per-kolom.
--    - Layanan Python pakai service_role -> bypass RLS (akses penuh, termasuk embedding).
--    - Frontend pakai anon -> boleh baca kolom AMAN saja:
--        * peta (via theses_map)        -> id,title,year,x,y,cluster,cluster_label
--        * abstrak saat klik titik (by id) -> abstract
--      TAPI 'embedding' TIDAK di-grant -> tak bisa dibaca anon.
alter table public.theses enable row level security;

-- Tutup akses penuh bawaan, lalu grant kolom aman saja.
revoke select on public.theses from anon, authenticated;
grant select (id, title, abstract, year, x, y, cluster, cluster_label)
  on public.theses to anon, authenticated;

-- RLS: izinkan baca semua baris (kolom sudah dibatasi oleh GRANT di atas).
drop policy if exists "anon baca kolom aman" on public.theses;
create policy "anon baca kolom aman" on public.theses
  for select to anon, authenticated using (true);

grant select on public.theses_map to anon, authenticated;

-- 6) Index ANN (OPSIONAL di ~2000 baris; pencarian eksak sudah instan).
--    Jika dipakai, BUAT SETELAH data masuk.
-- create index if not exists theses_embedding_idx
--   on public.theses using ivfflat (embedding vector_cosine_ops) with (lists = 100);
