// Authentication service for LandIt
class AuthService {
    constructor() {
        this.supabase = window.getSupabase();
        this.currentUser = null;
        this.isAuthenticated = false;
    }

    // Initialize auth state
    async init() {
        if (!this.supabase) {
            console.error('Supabase not initialized');
            return;
        }

        // Get current session
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
                this.onAuthChange('signed_in', session.user);
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.isAuthenticated = false;
                this.onAuthChange('signed_out', null);
            }
        });
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
                // Create user profile
                const { error } = await this.supabase
                    .from('users')
                    .insert({
                        id: user.id,
                        email: user.email,
                        first_name: user.user_metadata?.first_name || '',
                        last_name: user.user_metadata?.last_name || '',
                        role: user.user_metadata?.role || 'student'
                    });

                if (error) {
                    console.error('Error creating user profile:', error);
                }
            }
        } catch (error) {
            console.error('Error checking user profile:', error);
        }
    }

    // Sign up new user
    async signUp(email, password, userData = {}) {
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

    // Sign in user
    async signIn(email, password) {
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

    // Sign out user
    async signOut() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Get current user profile
    async getUserProfile() {
        if (!this.currentUser) return null;

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

    // Override this method to handle auth state changes in your app
    onAuthChange(event, user) {
        // This will be overridden by the main app
        console.log('Auth change:', event, user);
    }
}

// Create global auth service
window.authService = new AuthService();

export default AuthService;
