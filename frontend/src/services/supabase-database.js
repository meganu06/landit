// Supabase Database Service for Vue.js
class SupabaseDatabaseService {
    constructor() {
        this.supabase = null;
        this.init();
    }

    init() {
        if (window.supabaseClient) {
            this.supabase = window.supabaseClient;
        } else {
            window.addEventListener('supabase-ready', (event) => {
                this.supabase = event.detail.client;
            });
        }
    }

    // Skills management
    async getSkills() {
        if (!this.supabase) throw new Error('Supabase not initialized');

        const { data, error } = await this.supabase
            .from('skills')
            .select('*')
            .order('name');
        
        if (error) throw error;
        return data;
    }

    async getUserSkills(userId) {
        if (!this.supabase) throw new Error('Supabase not initialized');

        const { data, error } = await this.supabase
            .from('student_skills')
            .select(`
                *,
                skills (name, category)
            `)
            .eq('user_id', userId);
        
        if (error) throw error;
        return data;
    }

    async addUserSkill(userId, skillId, proficiencyLevel, source = 'manual') {
        if (!this.supabase) throw new Error('Supabase not initialized');

        const { data, error } = await this.supabase
            .from('student_skills')
            .upsert({
                user_id: userId,
                skill_id: skillId,
                proficiency_level: proficiencyLevel,
                source: source
            }, { onConflict: 'user_id,skill_id' })
            .select(`
                *,
                skills (name, category)
            `)
            .single();
        
        if (error) throw error;
        return data;
    }

    // Job matching
    async getJobMatches(userId) {
        if (!this.supabase) throw new Error('Supabase not initialized');

        try {
            // Get user skills
            const userSkills = await this.getUserSkills(userId);
            const userSkillNames = userSkills?.map(us => us.skills.name) || [];

            // Get placements with skills
            const { data: placements, error } = await this.supabase
                .from('placements')
                .select(`
                    *,
                    companies (name, industry),
                    placement_skills (
                        importance,
                        skills (name, category)
                    )
                `)
                .eq('is_active', true);

            if (error) throw error;

            // Calculate match scores
            const matches = placements.map(placement => {
                const requiredSkills = placement.placement_skills || [];
                let score = 0;
                let totalWeight = 0;
                
                requiredSkills.forEach(ps => {
                    const weight = ps.importance === 'required' ? 3 : ps.importance === 'preferred' ? 2 : 1;
                    totalWeight += weight;
                    
                    if (userSkillNames.includes(ps.skills.name)) {
                        score += weight;
                    }
                });
                
                const fitScore = totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
                
                return {
                    ...placement,
                    fitScore,
                    matchingSkills: requiredSkills.filter(ps => userSkillNames.includes(ps.skills.name)),
                    missingSkills: requiredSkills.filter(ps => !userSkillNames.includes(ps.skills.name))
                };
            }).sort((a, b) => b.fitScore - a.fitScore);

            return matches;
        } catch (error) {
            console.error('Error getting job matches:', error);
            throw error;
        }
    }

    // Companies
    async getCompanies() {
        if (!this.supabase) throw new Error('Supabase not initialized');

        const { data, error } = await this.supabase
            .from('companies')
            .select('*')
            .order('name');
        
        if (error) throw error;
        return data;
    }

    // Placements
    async getPlacements() {
        if (!this.supabase) throw new Error('Supabase not initialized');

        const { data, error } = await this.supabase
            .from('placements')
            .select(`
                *,
                companies (name, industry),
                placement_skills (
                    importance,
                    skills (name, category)
                )
            `)
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
    }
}

// Create global instance
window.landItDB = new SupabaseDatabaseService();

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SupabaseDatabaseService;
}
