# Use Cases

## UC1: Personalised Placement Recommendations

**Stakeholder/User Goal:** Student receives placement opportunities ranked by how well their skills match each role.

**Basic Flow:**
1. Student logs in and uploads CV (PDF or DOCX)
2. System stores the CV file and record in the database
3. Student submits CV text; system anonymises it and extracts skills via OpenAI
4. System compares extracted skills against all active placements
5. System generates match scores (0–100) and stores results
6. Student views placements ordered by match score
7. Student bookmarks placements of interest

**Alternative Flows:**
- **CV Upload Fails** — unsupported file type or missing file → system returns 400 error with message

---

## UC2: Skill Gap Identification and Guidance

**Stakeholder/User Goal:** Student understands which required skills they are missing for a specific role and receives actionable development guidance.

**Basic Flow:**
1. Student selects a placement from their match results
2. System retrieves the stored gap analysis report (matched and missing skills)
3. System sends missing skills, role name, company, and description to OpenAI
4. OpenAI returns 3 specific, actionable improvement steps per missing skill
5. System returns the recommendations to the student

**Alternative Flows:**
- **No missing skills** — if the student matches all required skills, an empty array is returned immediately with no LLM call
- **No match result found** — if matching has not been run for this placement, a 404 is returned prompting the student to run matching first
