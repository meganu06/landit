// ─── CV Types ──────────────────────────────────────────────────────────────
// Shared between frontend and backend. Do not add platform-specific logic here.

import type { PlacementWithCompany } from './placement.types';

export interface CV {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  /** File size in bytes */
  file_size: number;
  /** Raw text extracted from the CV file, or null if not yet processed */
  extracted_text: string | null;
  /** Skills parsed from the extracted CV text, or null if not yet processed */
  extracted_skills: string[] | null;
  uploaded_at: string;
}

export interface MatchResult {
  id: string;
  user_id: string;
  placement_id: string;
  /** Score between 0–100 indicating how well the student matches the placement */
  match_score: number;
  skills_matched: string[];
  skills_missing: string[];
  /** AI-generated recommendations for the student, or null if unavailable */
  recommendations: string | null;
  created_at: string;
}

/** MatchResult hydrated with its associated placement and company data */
export interface MatchResultWithPlacement extends MatchResult {
  placements: PlacementWithCompany;
}
