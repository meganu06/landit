export type SkillImportance = 'required' | 'preferred';

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

export interface PlacementSkill {
  name: string;
  importance: SkillImportance;
}

export interface MatchResult {
  id: string;
  user_id: string;
  placement_id: string;
  fit_score: number;
  gap_analysis_report: {
    skills_matched: string[];
    skills_missing: string[];
  };
  created_at: string;
}

export interface MatchResultWithPlacement extends MatchResult {
  placements: PlacementWithCompany;
}

export interface SkillRecommendation {
  skill: string;
  how_to_improve: string[];
}

export interface GapAnalysisResponse {
  placement_id: string;
  missing_skills: SkillRecommendation[];
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

export interface CreatePlacementRequest {
  company_id: string;
  role_name: string;
  description: string;
  location: string;
  salary_range?: string;
  deadline?: string;
  required_skills?: string[];
  desired_skills?: string[];
}
