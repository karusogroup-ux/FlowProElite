import { createClient } from '@supabase/supabase-js'

// Vite ONLY sees variables starting with VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// This check prevents the white screen if keys are missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Critical Error: Supabase keys are missing from Environment Variables!")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)