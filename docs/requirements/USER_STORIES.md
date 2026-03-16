# User Stories

## User Story 1: CV Upload and Personalised Placement Recommendations

> As a second-year computer science student looking for a placement, I want to upload my CV and receive personalised placement recommendations, so that I can identify relevant opportunities without manually filtering hundreds of irrelevant postings.

### Acceptance Tests

| Test | Scenario | Pass Criteria | Status |
|---|---|---|---|
| AT1.1: Happy Path | Given a registered Bath student with a valid CV (PDF or DOCX), when they upload and trigger matching | Ranked list of placements returned, showing role, employer, and match score | Implemented |
| AT1.2: Invalid Files | Given an unsupported or corrupted file, when upload is attempted | Upload blocked with an appropriate error message | Implemented |

---

## User Story 2: Skill Gap Analysis and Development Guidance

> As a placement-seeking student uncertain about my qualifications, I want skill gap analysis identifying the skills I am missing for a role, so that I can prioritise my skill development strategically.

### Acceptance Tests

| Test | Scenario | Pass Criteria | Status |
|---|---|---|---|
| AT2.1: Gap Analysis | Given a student with a CV uploaded and matching run, when they request gap analysis for a placement | Missing required skills are identified and returned | Implemented |
| AT2.3: Development Guidance | Given a missing skill is identified, when gap analysis is requested | 3 specific, actionable improvement steps are returned per missing skill, tailored to the role and company | Implemented |
| AT2.4: Error Handling | Given a system failure during analysis, when the error occurs | A clean error message is returned with no partial output | Implemented |
