# Testing Strategy

## Overview

Testing is focused on the backend. The backend uses Jest with ts-jest for TypeScript support.

Target coverage: 70%+ across backend services and controllers.

## Test Types

### Unit Tests
Test individual functions in isolation, with all external dependencies (Supabase, OpenAI) mocked.

Focus areas:
- Matching algorithm - score calculation, skill alias matching, edge cases (no skills, no placements, all required matched)
- Anonymiser service - each pattern type (SSN, NI number, phone, email, person, place, date, URL)
- Controller validation logic - input validation, error responses

### Integration Tests
Test full request/response cycles using a mock Supabase client. These verify that controllers return the correct status codes and response shapes given various input states.

## Test File Structure

```
backend/src/
├── controllers/__tests__/
│ ├── auth.controller.test.ts
│ ├── cv.controller.test.ts
│ ├── placement.controller.test.ts
│ ├── match.controller.test.ts
│ └── bookmark.controller.test.ts
├── services/__tests__/
│ ├── matching.service.test.ts
│ └── anonymizer.service.test.ts
└── middleware/__tests__/
└── auth.middleware.test.ts
```

## Running Tests

```bash
cd backend
npm test # run all tests
npm run test:coverage # run with coverage report
```

Coverage report is output to `backend/coverage/`.

## Mocking Strategy

- Supabase client - mocked at the module level using `jest.mock()`. Each test controls what the Supabase queries return.
- OpenAI client - mocked to return controlled responses without making real API calls.
- Express request/response - use minimal mock objects (`{ body: {}, user: {}, params: {} }` for req, `{ status, json }` for res).
