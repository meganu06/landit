// Supabase Authentication Service for Vue.js
class SupabaseAuthService {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.isAuthenticated = false;
        this.listeners = [];
        
        // Wait for Supabase to be ready
        this.init();
    }

    async init() {
        // Wait for Supabase client to be available
        if (window.supabaseClient) {
            this.supabase = window.supabaseClient;
            await this.checkSession();
        } else {
            // Listen for supabase-ready event
            window.addEventListener('supabase-ready', (event) => {
                this.supabase = event.detail.client;
                this.checkSession();
            });
        }
    }

    async checkSession() {
        if (!this.supabase) return;

        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session) {
                this.currentUser = session.user;
                this.isAuthenticated = true;
                await this.ensureUserProfile(session.user);
            }

            // Listen for auth changes
            this.supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('Auth state changed:', event);
                
                if (event === 'SIGNED_IN' && session) {
                    this.currentUser = session.user;
                    this.isAuthenticated = true;
                    await this.ensureUserProfile(session.user);
                } else if (event === 'SIGNED_OUT') {
                    this.currentUser = null;
                    this.isAuthenticated = false;
                }
                
                // Notify listeners
                this.notifyListeners(event, session);
            });
        } catch (error) {
            console.error('Session check error:', error);
        }
    }

    // Ensure user profile exists in database
    async ensureUserProfile(user) {
        try {
            const { data: existingUser } = await this.supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

            if (!existingUser) {
                const { error } = await this.supabase
                    .from('users')
                    .insert({
                        id: user.id,
                        email: user.email,
                        first_name: user.user_metadata?.first_name || '',
                        last_name: user.user_metadata?.last_name || '',
                        role: user.user_metadata?.role || 'student'
                    });

                if (error) console.error('Error creating user profile:', error);
            }
        } catch (error) {
            console.error('Error checking user profile:', error);
        }
    }

    // Authentication methods
    async signUp(email, password, userData = {}) {
        if (!this.supabase) throw new Error('Supabase not initialized');

        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        first_name: userData.firstName || '',
                        last_name: userData.lastName || '',
                        role: userData.role || 'student'
                    }
                }
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async signIn(email, password) {
        if (!this.supabase) throw new Error('Supabase not initialized');

        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        if (!this.supabase) throw new Error('Supabase not initialized');

        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // User profile methods
    async getUserProfile() {
        if (!this.currentUser || !this.supabase) return null;

        try {
            const { data, error } = await this.supabase
                .from('users')
                .select(`
                    *,
                    student_skills (
                        proficiency_level,
                        source,
                        skills (name, category)
                    ),
                    cv (file_url, parsed_content, uploaded_at)
                `)
                .eq('id', this.currentUser.id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    }

    // Event listeners for Vue components
    onAuthChange(callback) {
        this.listeners.push(callback);
        
        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    notifyListeners(event, session) {
        this.listeners.forEach(callback => {
            try {
                callback(event, session, this.currentUser);
            } catch (error) {
                console.error('Auth listener error:', error);
            }
        });
    }

    // Getters
    getUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return this.isAuthenticated;
    }

    getSupabaseClient() {
        return this.supabase;
    }
}

// Create global instance
window.landItAuth = new SupabaseAuthService();

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SupabaseAuthService;
}
