-- ============================================================================
-- Serupa — Fungsi Database (RPC & helper). Jalankan SETELAH 01_schema.sql.
-- ============================================================================

-- --- Apakah user saat ini admin? (dipakai oleh RLS) -------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- --- Buat profil otomatis saat user mendaftar -------------------------------
-- Memetakan user_metadata (nim, full_name, recovery_email, role) → profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nim, role, full_name, email)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'nim', ''),
    coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'student'),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    coalesce(nullif(new.raw_user_meta_data->>'recovery_email', ''), new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --- Pencarian kemiripan (cosine) terhadap korpus (PRD §10) -----------------
-- SECURITY DEFINER: boleh membaca thesis_embeddings meski pemanggil bukan admin.
-- Dipanggil dari /api/scan memakai service role.
create or replace function public.match_theses(
  query_embedding vector(1024),
  match_count int default 5,
  model_version text default 'BAAI/bge-m3'
)
returns table (
  thesis_id  uuid,
  title      text,
  author     text,
  year       int,
  abstract   text,
  source_url text,
  similarity float
)
language sql stable security definer set search_path = public as $$
  select t.id, t.title, t.author, t.year, t.abstract, t.source_url,
         1 - (e.embedding <=> query_embedding) as similarity
  from public.thesis_embeddings e
  join public.theses t on t.id = e.thesis_id
  where e.model_version = match_theses.model_version
  order by e.embedding <=> query_embedding
  limit match_count;
$$;

-- --- Judul yang BELUM punya embedding utk model tertentu (dipakai script) ---
create or replace function public.theses_missing_embedding(
  model text,
  lim int default 200
)
returns table (id uuid, title text, abstract text)
language sql stable security definer set search_path = public as $$
  select t.id, t.title, t.abstract
  from public.theses t
  where not exists (
    select 1 from public.thesis_embeddings e
    where e.thesis_id = t.id and e.model_version = model
  )
  order by t.created_at
  limit lim;
$$;

-- --- Statistik korpus utk dashboard admin (FA4) -----------------------------
create or replace function public.corpus_stats()
returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'totalRecords',    count(*),
    'withAbstract',    count(*) filter (where length(coalesce(abstract,'')) > 40),
    'missingAbstract', count(*) filter (where length(coalesce(abstract,'')) <= 40),
    'suspiciousYear',  count(*) filter (where year is null or year < 1990 or year > extract(year from now())),
    'firstYear',       min(year),
    'lastYear',        max(year),
    'lastIndexed',     to_char(max(created_at), 'YYYY-MM-DD'),
    'perYear',         coalesce((
      select json_agg(json_build_object('year', y, 'count', c) order by y)
      from (
        select year as y, count(*) as c
        from public.theses
        where year is not null
        group by year
      ) yr
    ), '[]'::json)
  )
  from public.theses;
$$;

-- Hak akses eksekusi
revoke all on function public.match_theses(vector, int, text) from public;
grant execute on function public.match_theses(vector, int, text) to service_role, authenticated;
grant execute on function public.theses_missing_embedding(text, int) to service_role;
grant execute on function public.corpus_stats() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated;
