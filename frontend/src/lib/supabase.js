// Import Supabase from CDN (add script tag to HTML first)
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'

export const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey)
