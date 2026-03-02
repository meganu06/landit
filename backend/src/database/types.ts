export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'student' | 'admin';
  created_at: string;
}

export interface CV {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  extracted_text: string | null;
  extracted_skills: string[] | null;
  uploaded_at: string;
}

export interface Company {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  created_at: string;
}

export interface Placement {
  id: string;
  company_id: string;
  role_name: string;
  description: string;
  location: string;
  salary_range: string | null;
  deadline: string | null;
  required_skills: string[];
  desired_skills: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlacementWithCompany extends Placement {
  companies: Pick<Company, 'name' | 'description' | 'website' | 'logo_url'>;
}

export interface StudentSkill {
  id: string;
  user_id: string;
  skill_name: string;
  proficiency_level: number | null;
  created_at: string;
}

export interface MatchResult {
  id: string;
  user_id: string;
  placement_id: string;
  match_score: number;
  skills_matched: string[];
  skills_missing: string[];
  recommendations: string | null;
  created_at: string;
}

export interface MatchResultWithPlacement extends MatchResult {
  placements: PlacementWithCompany;
}

export interface Bookmark {
  id: string;
  user_id: string;
  placement_id: string;
  created_at: string;
}

export interface BookmarkWithPlacement extends Bookmark {
  placements: PlacementWithCompany;
}
