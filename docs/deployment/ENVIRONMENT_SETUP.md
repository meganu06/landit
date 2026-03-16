# Environment Setup

## Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Server
PORT=3001
```

### Variable Reference

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (not the anon key) — used for admin auth operations |
| `OPENAI_API_KEY` | Yes | OpenAI API key for CV parsing and gap analysis |
| `PORT` | No | Server port, defaults to `3001` |

> **Note:** The backend uses the service role key so it can call `supabase.auth.admin.createUser()` and `supabase.auth.admin.deleteUser()`. Never expose this key on the frontend.

## Frontend Environment Variables

The frontend uses Supabase directly for auth token management. Create a `.env` file in the `frontend/` directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001/api
```
