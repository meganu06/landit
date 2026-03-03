import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wbcgymgqqrhwgshkdfcx.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiY2d5bWdxcXJod2dzaGtkZmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNzU5NTQsImV4cCI6MjA4MDg1MTk1NH0.js40qIOVH_PPaHyzo0AjTuiVsPxRy9PAaHkTtcR_P1A'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
