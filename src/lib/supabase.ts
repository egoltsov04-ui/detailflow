import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

const isolatedPreview=import.meta.env.DEV&&window.location.pathname==='/__qa'
export const supabase = !isolatedPreview && url && key ? createClient(url, key) : null

export const supabaseSetupMessage = 'Додайте VITE_SUPABASE_URL і VITE_SUPABASE_ANON_KEY у файл .env, потім перезапустіть npm run dev.'
