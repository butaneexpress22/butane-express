import { createClient } from '@supabase/supabase-js'

// ──────────────────────────────────────────────
// Connexion à votre projet Supabase
// Ces valeurs viennent de : Supabase > Settings > API
// ──────────────────────────────────────────────
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '⚠️ Variables Supabase manquantes. Vérifiez votre fichier .env (VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY)'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)
