import { createClient } from "@supabase/supabase-js"
import { SUPABASE_URL, SUPABASE_ANON_KEY, HAS_SUPABASE } from "./config"

// Klien Supabase hanya dibuat bila kredensial anon tersedia.
// Di mode demo bernilai null, dan lapisan api.js akan memakai data contoh.
export const supabase = HAS_SUPABASE ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null
