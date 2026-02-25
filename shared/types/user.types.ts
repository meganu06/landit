// ─── User Types ────────────────────────────────────────────────────────────
// Shared between frontend and backend. Do not add platform-specific logic here.

export type UserRole = 'student' | 'admin';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  created_at: string;
}

export interface StudentSkill {
  id: string;
  user_id: string;
  skill_name: string;
  /** Proficiency level on a numeric scale (e.g. 1–5), or null if unspecified */
  proficiency_level: number | null;
  created_at: string;
}

// Utility: public-facing user shape (omits sensitive fields)
export type PublicUser = Pick<User, 'id' | 'first_name' | 'last_name' | 'role'>;
