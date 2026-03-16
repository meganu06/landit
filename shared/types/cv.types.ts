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

export interface Skill {
  id: string;
  name: string;
  category: string;
}

export interface StudentSkill {
  id: string;
  user_id: string;
  skill_id: string;
  skill_name: string;
  proficiency_level: number | null;
  source: 'cv' | 'manual';
  created_at: string;
}

export interface ExtractedSkill {
  id: string;
  name: string;
}

export interface CVUploadResponse {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  uploaded_at: string;
}

export interface SkillExtractionResponse {
  skills: ExtractedSkill[];
}
