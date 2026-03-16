# Database Design

Database: PostgreSQL via Supabase.

## Tables

### users
Stores registered student and admin accounts. Created automatically on registration via Supabase Auth.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key, matches Supabase Auth user ID |
| email | text | Unique, must end in @bath.ac.uk |
| first_name | text | |
| last_name | text | |
| role | text | `'student'` or `'admin'` |
| created_at | timestamptz | |

---

### cvs
Stores uploaded CV metadata. The file itself lives in Supabase Storage (`cvs` bucket).

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | FK → users.id |
| file_name | text | Original filename |
| file_url | text | Public URL in Supabase Storage |
| file_size | integer | Bytes |
| extracted_text | text | Nullable |
| extracted_skills | text[] | Nullable |
| uploaded_at | timestamptz | |

---

### companies
Companies that have posted placements.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| name | text | |
| description | text | Nullable |
| website | text | Nullable |
| logo_url | text | Nullable |
| created_at | timestamptz | |

---

### placements
Job placement listings.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| company_id | uuid | FK → companies.id |
| role_name | text | Job title |
| description | text | Full job description |
| location | text | |
| salary_range | text | Nullable |
| deadline | text | Nullable |
| required_skills | text[] | Legacy field (pre-skill table) |
| desired_skills | text[] | Legacy field (pre-skill table) |
| is_active | boolean | Soft delete flag |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### skills
Canonical skill definitions, shared across students and placements.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| name | text | Unique (case-insensitive lookup) |
| category | text | e.g. `'extracted'`, `'technical'` |

---

### student_skills
Skills belonging to a student, extracted from their CV or added manually.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | FK → users.id |
| skill_id | uuid | FK → skills.id |
| proficiency_level | integer | Nullable (default 3 when from CV) |
| source | text | `'cv'` or `'manual'` |
| created_at | timestamptz | |

Unique constraint: `(user_id, skill_id)`

---

### placement_skills
Skills required or preferred for a placement, extracted by OpenAI.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| placement_id | uuid | FK → placements.id |
| skill_id | uuid | FK → skills.id |
| importance | text | `'required'` or `'preferred'` |

---

### match_results
Computed match scores between a student and each placement.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | FK → users.id |
| placement_id | uuid | FK → placements.id |
| fit_score | integer | 0–100 |
| gap_analysis_report | jsonb | `{ skills_matched: [], skills_missing: [] }` |
| created_at | timestamptz | |

Match results are fully replaced each time matching is run for a user.

---

### bookmarks
Placements saved by a student.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | FK → users.id |
| placement_id | uuid | FK → placements.id |
| created_at | timestamptz | |

Unique constraint: `(user_id, placement_id)`

## Key Relationships

```
users ──< cvs
users ──< student_skills >── skills
users ──< match_results >── placements
users ──< bookmarks >── placements
companies ──< placements
placements ──< placement_skills >── skills
```
