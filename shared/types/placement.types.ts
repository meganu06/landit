// ─── Placement Types ────────────────────────────────────────────────────────
// Shared between frontend and backend. Do not add platform-specific logic here.

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
  /** Human-readable salary range string (e.g. "£25,000–£30,000"), or null if undisclosed */
  salary_range: string | null;
  /** ISO 8601 date string for the application deadline, or null if rolling */
  deadline: string | null;
  required_skills: string[];
  desired_skills: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

/** Placement hydrated with its associated company data */
export interface PlacementWithCompany extends Placement {
  companies: Pick<Company, 'name' | 'description' | 'website' | 'logo_url'>;
}

export interface Bookmark {
  id: string;
  user_id: string;
  placement_id: string;
  created_at: string;
}

/** Bookmark hydrated with its associated placement and company data */
export interface BookmarkWithPlacement extends Bookmark {
  placements: PlacementWithCompany;
}
