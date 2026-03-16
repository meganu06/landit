# Contributing to LandIt

## Development Workflow

1. Create a feature branch from `main`
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Make your changes and commit
3. Open a pull request into `main`
4. At least one team member must review and approve before merging

## Branch Naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feat/description` | `feat/gap-analysis` |
| Bug fix | `fix/description` | `fix/match-score-bug` |
| Docs | `docs/description` | `docs/api-reference` |
| Refactor | `refactor/description` | `refactor/cv-controller` |

## Commit Messages

Use clear, present-tense messages describing what the commit does:
```
Add gap analysis endpoint
Fix skill alias matching for Node.js
Update README with correct install commands
```

## Code Style

- TypeScript for all backend code
- ESLint + Prettier — run before committing
- No `console.log` left in production code (use `console.error` for errors)
- Keep controllers thin — business logic belongs in services

## Running Tests

```bash
cd backend
npm test              # run all tests
npm run test:coverage # run with coverage report
```

Target: 70%+ coverage across backend services and controllers.

## Environment Setup

See [deployment/ENVIRONMENT_SETUP.md](deployment/ENVIRONMENT_SETUP.md) for required environment variables.

## Pull Request Checklist

- [ ] Code follows existing patterns
- [ ] Tests added or updated for changed logic
- [ ] No hardcoded secrets or API keys
- [ ] README or docs updated if behaviour changed
- [ ] PR description explains what changed and why
