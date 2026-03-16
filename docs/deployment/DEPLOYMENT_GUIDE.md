# Deployment Guide

## Local Development

### Prerequisites
- Node.js 18+
- A Supabase project
- An OpenAI API key

### Setup

```bash
# Install all dependencies
npm run install:all

# Set up backend environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your Supabase and OpenAI credentials

# Start both servers
npm run dev:backend # runs on http://localhost:3001
npm run dev:frontend # runs on http://localhost:5173 (or configured port)
```


---

## CI/CD

GitHub Actions is configured for automated testing and deployment. See `.github/workflows/` for pipeline configuration.

---

## Health Check

Once deployed, verify the backend is running:

```
GET https://your-backend-url/health
→ { "status": "ok" }
```
