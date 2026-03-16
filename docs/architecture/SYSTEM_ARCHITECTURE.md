# System Architecture

## Overview

LandIt is a web application with a decoupled frontend and backend, using Supabase as the data and auth layer and OpenAI for AI-powered features.

```
┌─────────────┐ HTTP/REST ┌──────────────────┐
│ Frontend    │ ────────> │ Express Backend  │
│ (Browser)   │           │ (Node.js / TS)   │
└─────────────┘           └────────┬─────────┘
                                   │
                     ┌─────────────┼────────────────────┐
                          │            │            │
                 ┌────────▼──────┐ ┌───▼───┐ ┌──────▼──────┐
                 │ Supabase      │ │ OpenAI│ │ Supabase    │
                 │ (PostgreSQL)  │ │ API   │ │ Storage     │
                 └───────────────┘ └───────┘ └─────────────┘
```

## Components

### Frontend
- Served as static files
- Communicates with the backend via REST API
- Handles Supabase Auth token management (access + refresh tokens)

### Backend (Node.js / Express / TypeScript)
- Stateless REST API running on port 3001
- Validates and routes all requests
- Orchestrates calls to Supabase and OpenAI
- Enforces authentication (via Supabase JWT validation) and role-based access

### Supabase
- **PostgreSQL database** - stores all application data (users, CVs, placements, skills, match results, bookmarks)
- **Auth** - manages user sessions and JWT tokens; only `@bath.ac.uk` emails are allowed
- **Storage** - stores uploaded CV files in the `cvs` bucket

### OpenAI (gpt-4o-mini)
- **CV skill extraction** - parses anonymised CV text and returns a list of skills (temperature: 0)
- **Placement skill extraction** - classifies skills from a job description as required or preferred (temperature: 0)
- **Gap analysis** - generates 3 specific improvement steps per missing skill, tailored to the role and company (temperature: 0.4)

## Request Flow: CV Upload + Skill Extraction

1. User uploads a CV file → backend uploads to Supabase Storage, saves record to `cvs` table
2. Frontend extracts text from the file client-side, sends it to `POST /cv/extract-skills`
3. Backend anonymises the text (removes names, emails, phones, NI numbers, etc.)
4. Anonymised text sent to OpenAI → returns array of skill names
5. Each skill is found-or-created in the `skills` table
6. Skills upserted into `student_skills` for the user
7. Matching automatically runs (`runMatchingForUser`) to update `match_results`

## Request Flow: Matching Algorithm

1. Fetch user's skills from `student_skills` (joined with `skills`)
2. Fetch all active placements with their `placement_skills` (joined with `skills`)
3. For each placement, calculate a fit score 0–100 using weighted required/preferred coverage with a curve and boost system
4. Delete existing match results for user, insert new ones with `fit_score` and `gap_analysis_report`

## Security

- All routes (except `/auth/register`, `/auth/login`, `/health`) require a valid Supabase JWT
- Admin-only routes additionally check `role === 'admin'` from the `users` table
- CV text is anonymised before any LLM call - personal identifiers are stripped using regex and the `compromise` NLP library
- File uploads are validated by MIME type and size (10 MB max)
