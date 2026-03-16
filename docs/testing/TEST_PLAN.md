# Test Plan

## Auth Controller

| Test | Expected |
|---|---|
| POST /register with valid data | 201 + success message |
| POST /register with non-@bath.ac.uk email | 400 error |
| POST /register with password < 6 chars | 400 error |
| POST /register with missing fields | 400 error |
| POST /login with valid credentials | 200 + tokens + user |
| POST /login with missing fields | 400 error |
| POST /logout with valid token | 200 + message |

## CV Controller

| Test | Expected |
|---|---|
| POST /cv/upload with no file | 400 error |
| POST /cv/upload with invalid MIME type | 400 error |
| POST /cv/upload with valid PDF | 201 + CV record |
| POST /cv/extract-skills with valid text | 200 + skills array |
| POST /cv/extract-skills with text < 20 chars | 400 error |
| POST /cv/extract-skills — auto-matching triggered | matching service called |
| POST /cv/extract-skills — matching fails | still returns 200 |
| GET /cv/me with no CV uploaded | 404 error |
| GET /cv/me with existing CV | 200 + CV record |

## Placement Controller

| Test | Expected |
|---|---|
| GET /placements | 200 + array of active placements |
| GET /placements/:id (exists) | 200 + placement |
| GET /placements/:id (not found) | 404 error |
| POST /placements with missing required fields | 400 error |
| POST /placements with valid data (admin) | 201 + placement |
| PUT /placements/:id (admin) | 200 + updated placement |
| DELETE /placements/:id (admin) | 200 + message |
| POST /placements/extract-skills missing fields | 400 error |
| POST /placements/extract-skills valid | 200 + classified skills |

## Match Controller

| Test | Expected |
|---|---|
| POST /match/run | 200 + message |
| POST /match/run — matching service throws | 500 error |
| GET /match/results | 200 + array ordered by fit_score |
| GET /match/results?minScore=50 | only results ≥50 |
| GET /match/gap-analysis/:id (no match result) | 404 error |
| GET /match/gap-analysis/:id (no missing skills) | 200 + empty array |
| GET /match/gap-analysis/:id (has missing skills) | 200 + recommendations |

## Bookmark Controller

| Test | Expected |
|---|---|
| GET /bookmarks | 200 + array with placement info |
| POST /bookmarks/:placementId | 201 + bookmark |
| POST /bookmarks/:placementId (duplicate) | 201 (upsert, no error) |
| DELETE /bookmarks/:placementId | 200 + message |

## Auth Middleware

| Test | Expected |
|---|---|
| Request with no Authorization header | 401 error |
| Request with malformed header | 401 error |
| Request with invalid/expired token | 401 error |
| Request with valid token | req.user populated, next() called |
| requireAdmin with student role | 403 error |
| requireAdmin with admin role | next() called |

## Matching Service

| Test | Expected |
|---|---|
| Student with all required skills | score ≥85 |
| Student with no skills | score = 0 |
| Student with 1 of 5 required skills | score ≤50 (low cap applies) |
| Student with ≥1 required skill | score includes floor boost (+15) |
| Placement with no skills | score = 0 |
| Skill alias match (js → javascript) | counted as matched |
| Score clamped to 0–100 | always in range |

## Anonymiser Service

| Test | Input | Expected |
|---|---|---|
| SSN pattern | `123-45-6789` | `<SSN>` |
| NI number | `AB123456C` | `<NI_NUMBER>` |
| URL | `https://github.com/user` | `<URL>` |
| Phone (10+ digits) | `+44 7911 123456` | `<PHONE>` |
| Person name (via NLP) | `John Smith` | `<PERSON>` |
| Email (via NLP) | `john@bath.ac.uk` | `<EMAIL>` |
| Clean text | `React TypeScript Node.js` | unchanged |
