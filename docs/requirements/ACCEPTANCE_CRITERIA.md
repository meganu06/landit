# Acceptance Criteria

---

## User Story 1: CV Upload and Placement Recommendations

**AC-1.1: Happy Path**
- Given a registered Bath student with a valid PDF or DOCX CV
- When they upload the file and matching is run
- Then placements are returned ordered by match score
- And each result includes role name, company, and fit score

**AC-1.2: Invalid File Upload**
- Given a file that is not PDF or DOCX
- When upload is attempted
- Then the upload is rejected with HTTP 400
- And an error message is returned

---

## User Story 2: Skill Gap Analysis and Development Guidance

**AC-2.1: Gap Analysis**
- Given a student who has run matching for a placement
- When they request gap analysis for that placement
- Then the response includes which required skills they are missing
- And which required skills they have matched

**AC-2.3: Development Guidance**
- Given missing required skills have been identified
- When gap analysis is requested
- Then exactly 3 actionable improvement steps are returned per missing skill
- And the steps are specific to the role, company, and industry context (not generic)

**AC-2.4: Error Handling**
- Given a failure during gap analysis (e.g. OpenAI unavailable)
- When the error occurs
- Then HTTP 500 is returned with an error message
- And no partial output is returned

---

## Use Case 1: CV Upload Flow

**AC-UC1.1: Skill Extraction**
- Given CV text of at least 20 characters
- When extraction is triggered
- Then skills are identified via OpenAI and saved to the student's profile
- And matching is automatically re-run after extraction

**AC-UC1.2: Failed Upload**
- Given a missing file or unsupported MIME type
- When upload is attempted
- Then HTTP 400 is returned with an appropriate error message

---

## Use Case 2: Gap Analysis Flow

**AC-UC2.1: No Missing Skills**
- Given a student who matches all required skills for a placement
- When gap analysis is requested
- Then an empty array is returned immediately without calling OpenAI

**AC-UC2.2: No Match Result**
- Given matching has not been run for a placement
- When gap analysis is requested
- Then HTTP 404 is returned indicating matching must be run first
