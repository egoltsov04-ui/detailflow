import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && key ? createClient(url, key) : null

export const supabaseSetupMessage = 'Додайте VITE_SUPABASE_URL і VITE_SUPABASE_ANON_KEY у файл .env, потім перезапустіть npm run dev.'
