-- ============================================================================
-- Serupa — Skema Database (PRD §9)
-- Jalankan di Supabase: SQL Editor → tempel isi file → Run.
-- Urutan: 01_schema.sql → 02_functions.sql → 03_rls.sql
-- Dimensi vektor default 1024 (BAAI/bge-m3). Ganti bila mengganti model.
-- ============================================================================

create extension if not exists vector;      -- pgvector
create extension if not exists pgcrypto;     -- gen_random_uuid()

-- --- Korpus skripsi ---------------------------------------------------------
create table if not exists public.theses (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  author      text,
  year        int,
  abstract    text,
  prodi       text default 'fik',
  source_url  text,
  created_at  timestamptz not null default now()
);

-- --- Embedding korpus (vektor per model; model_version agar bisa migrasi) ----
create table if not exists public.thesis_embeddings (
  thesis_id      uuid not null references public.theses(id) on delete cascade,
  model_version  text not null,
  embedding      vector(1024) not null,
  created_at     timestamptz not null default now(),
  primary key (thesis_id, model_version)
);

-- Index ANN cosine. Skala ±2000 sebenarnya cukup brute-force (PRD §8),
-- tetapi HNSW membantu bila korpus tumbuh & tidak menyakiti pada skala kecil.
create index if not exists thesis_embeddings_cos_idx
  on public.thesis_embeddings using hnsw (embedding vector_cosine_ops);

-- --- Profil pengguna (identitas + peran) ------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nim         text unique,
  role        text not null default 'student' check (role in ('student','admin')),
  full_name   text,
  email       text,                     -- email ASLI utk pemulihan (PRD §8)
  created_at  timestamptz not null default now()
);

-- --- Scan mahasiswa (satu baris per analisis) -------------------------------
create table if not exists public.scans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  input_title   text not null,
  input_summary text,
  input_pico    jsonb,
  top_n         int default 5,
  created_at    timestamptz not null default now()
);
create index if not exists scans_user_created_idx on public.scans(user_id, created_at desc);

-- --- Hasil Top-N per scan ---------------------------------------------------
create table if not exists public.scan_results (
  id          uuid primary key default gen_random_uuid(),
  scan_id     uuid not null references public.scans(id) on delete cascade,
  thesis_id   uuid references public.theses(id) on delete set null,
  rank        int not null,
  score       numeric,
  band        text,
  created_at  timestamptz not null default now()
);
create index if not exists scan_results_scan_idx on public.scan_results(scan_id);

-- --- Pelabelan untuk test set evaluasi (FA7, PRD §10) -----------------------
create table if not exists public.labels (
  id           uuid primary key default gen_random_uuid(),
  query_text   text,
  thesis_a_id  uuid references public.theses(id) on delete cascade,
  thesis_b_id  uuid references public.theses(id) on delete cascade,
  label        text check (label in ('duplikat','tidak','borderline')),
  labeled_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);
