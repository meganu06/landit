export interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
  role: 'student' | 'admin'
  degree_programme?: string
  year_of_study?: number
  bio?: string
  linkedin_url?: string
  github_url?: string
  location_preference?: string
  created_at: string
}

export interface Skill {
  id: string
  name: string
  category?: string
}

export interface StudentSkill {
  skill_id: string
  user_id: string
  proficiency_level: number
  source: 'cv' | 'manual'
  skills?: Skill
  skill_name?: string
}

export interface Company {
  id: string
  name: string
  industry?: string
  website_url?: string
  description?: string
}

export interface PlacementSkill {
  placement_id: string
  skill_id: string
  importance: 'required' | 'preferred'
  skills?: Skill
}

export interface Placement {
  id: string
  company_id: string
  title: string
  description?: string
  location?: string
  salary_range?: number
  deadline?: string
  application_link?: string
  is_active: boolean
  required_skills?: string[]
  desired_skills?: string[]
  created_at: string
  companies?: Company
  placement_skills?: PlacementSkill[]
}

export interface MatchScore {
  score: number
  matched: string[]
  missing: string[]
}

export interface CV {
  id: string
  user_id: string
  file_url: string
  parsed_content?: string
  uploaded_at: string
}

export interface Bookmark {
  id: string
  user_id: string
  placement_id: string
  created_at: string
  placements?: Placement
}
