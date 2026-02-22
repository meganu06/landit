// Import Supabase from CDN (add script tag to HTML first)
const supabaseUrl = 'https://wbcgymgqqrhwgshkdfcx.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiY2d5bWdxcXJod2dzaGtkZmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNzU5NTQsImV4cCI6MjA4MDg1MTk1NH0.js40qIOVH_PPaHyzo0AjTuiVsPxRy9PAaHkTtcR_P1A'

export const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey)
