// Supabase configuration for LandIt
const supabaseConfig = {
    url: 'https://wbcgymgqqrhwgshkdfcx.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiY2d5bWdxcXJod2dzaGtkZmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNzU5NTQsImV4cCI6MjA4MDg1MTk1NH0.js40qIOVH_PPaHyzo0AjTuiVsPxRy9PAaHkTtcR_P1A'
}

// Initialize Supabase client
let supabase = null;

function initSupabase() {
    if (typeof window !== 'undefined' && window.supabase) {
        supabase = window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);
        console.log('✅ Supabase client initialized');
        return supabase;
    }
    return null;
}

// Export for global use
window.initSupabase = initSupabase;
window.getSupabase = () => supabase;

export { supabaseConfig, initSupabase };
