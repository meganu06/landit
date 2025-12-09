// Database service for LandIt
class DatabaseService {
    constructor(supabaseClient) {
        this.supabase = supabaseClient
    }

    // User operations
    async getCurrentUser() {
        const { data: { user } } = await this.supabase.auth.getUser()
        if (user) {
            const { data } = await this.supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single()
            return data
        }
        return null
    }

    async updateUserProfile(userId, updates) {
        const { data, error } = await this.supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select()
            .single()
        return { data, error }
    }

    // Companies
    async getCompanies() {
        const { data, error } = await this.supabase
            .from('companies')
            .select('*')
            .order('name')
        return { data, error }
    }

    async createCompany(companyData) {
        const { data, error } = await this.supabase
            .from('companies')
            .insert(companyData)
            .select()
            .single()
        return { data, error }
    }

    // Placements
    async getPlacements() {
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
            .order('created_at', { ascending: false })
        return { data, error }
    }

    async createPlacement(placementData) {
        const { data, error } = await this.supabase
            .from('placements')
            .insert(placementData)
            .select()
            .single()
        return { data, error }
    }

    // Skills
    async getSkills() {
        const { data, error } = await this.supabase
            .from('skills')
            .select('*')
            .order('name')
        return { data, error }
    }

    async createSkill(skillData) {
        const { data, error } = await this.supabase
            .from('skills')
            .insert(skillData)
            .select()
            .single()
        return { data, error }
    }

    // Student skills
    async getUserSkills(userId) {
        const { data, error } = await this.supabase
            .from('student_skills')
            .select(`
                *,
                skills (name, category)
            `)
            .eq('user_id', userId)
        return { data, error }
    }

    async addUserSkill(userId, skillId, proficiencyLevel, source) {
        const { data, error } = await this.supabase
            .from('student_skills')
            .insert({
                user_id: userId,
                skill_id: skillId,
                proficiency_level: proficiencyLevel,
                source: source
            })
            .select()
            .single()
        return { data, error }
    }

    // Match results
    async getMatchResults(userId) {
        const { data, error } = await this.supabase
            .from('match_results')
            .select(`
                *,
                placements (
                    title,
                    companies (name)
                )
            `)
            .eq('user_id', userId)
            .order('fit_score', { ascending: false })
        return { data, error }
    }

    async createMatchResult(matchData) {
        const { data, error } = await this.supabase
            .from('match_results')
            .insert(matchData)
            .select()
            .single()
        return { data, error }
    }

    // CV operations
    async uploadCV(userId, file) {
        try {
            // Upload file to Supabase Storage
            const fileExt = file.name.split('.').pop()
            const fileName = `${userId}-${Date.now()}.${fileExt}`
            
            const { data: uploadData, error: uploadError } = await this.supabase.storage
                .from('cvs')
                .upload(fileName, file)

            if (uploadError) return { error: uploadError }

            // Get public URL
            const { data: { publicUrl } } = this.supabase.storage
                .from('cvs')
                .getPublicUrl(fileName)

            // Save CV record to database
            const { data, error } = await this.supabase
                .from('cv')
                .insert({
                    user_id: userId,
                    file_url: publicUrl
                })
                .select()
                .single()

            return { data, error }
        } catch (error) {
            return { error }
        }
    }

    async getUserCV(userId) {
        const { data, error } = await this.supabase
            .from('cv')
            .select('*')
            .eq('user_id', userId)
            .order('uploaded_at', { ascending: false })
            .limit(1)
            .single()
        return { data, error }
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DatabaseService
}
