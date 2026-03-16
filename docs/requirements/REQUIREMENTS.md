# Requirements

Requirements were established through academic literature review, analysis of existing solutions, and direct stakeholder interviews. This document reflects requirements that are currently implemented in the codebase.

## Functional Requirements

### User Management

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR1 | System shall allow students to register and authenticate using University of Bath email (@bath.ac.uk) with validation | Must | Implemented |

### CV Processing

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR3 | System shall accept CV uploads in PDF and DOCX formats up to 10 MB | Must | Implemented |
| FR5 | System shall identify technical skills from CV text using LLM (OpenAI gpt-4o-mini) | Must | Implemented |

### Placement Matching

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR8 | System shall calculate skill-based match scores between student skills and placement requirements | Must | Implemented |
| FR9 | System shall generate match scores (0–100) for each placement | Must | Implemented |
| FR10 | System shall return placement recommendations ordered by match score | Must | Implemented |
| FR11 | System shall record which required skills the student has matched and which are missing | Must | Implemented |

### Gap Analysis

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR12 | System shall identify missing required skills for each placement | Must | Implemented |
| FR14 | System shall provide 3 specific, actionable development recommendations per missing skill via LLM | Should | Implemented |

### Data Management

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR15 | System shall maintain a database of active placement opportunities with required and preferred skills | Must | Implemented |
| FR16 | System shall allow administrators to create, update, and deactivate placement listings | Must | Implemented |
| FR17 | System shall allow students to bookmark and unbookmark placements | Should | Implemented |

---

## Non-Functional Requirements

### Security & Privacy

| ID | Requirement | Priority | Status |
|---|---|---|---|
| NFR4 | CV data is encrypted at rest and in transit (handled by Supabase) | Must | Implemented |
| NFR5 | Passwords are hashed using bcrypt (handled by Supabase Auth) | Must | Implemented |
| NFR6 | JWT authentication is used for all protected routes | Must | Implemented |
| NFR8 | CV text is anonymised before being sent to any external LLM — names, emails, phone numbers, NI numbers, SSNs, URLs are stripped | Must | Implemented |
| NFR9 | Personal identifiers and proxy characteristics are excluded from matching — matching is based solely on skills | Must | Implemented |

---

## Requirements Traceability

Key conflicts identified and resolved during requirements refinement:

- **Transparency (FR9, FR11) vs. Usability:** Resolved via progressive disclosure — match scores are shown first, with detailed gap analysis available on request.
- **Semantic analysis depth vs. Performance:** Resolved via hybrid approach — AI is used once at data input to extract skills into the database; matching runs as an optimised database query, not a real-time LLM call.
- **Personalisation vs. Fairness (NFR8, NFR9):** CV anonymisation ensures matching is based on skills only, not personal characteristics.
