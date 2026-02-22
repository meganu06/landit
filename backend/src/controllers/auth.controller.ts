import { Request, Response } from 'express';
import { supabase } from '../supabase/client';

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, first_name, last_name } = req.body;

  if (!email || !password || !first_name || !last_name) {
    res.status(400).json({ error: 'email, password, first_name, and last_name are required' });
    return;
  }

  if (!email.endsWith('@bath.ac.uk')) {
    res.status(400).json({ error: 'Only University of Bath email addresses (@bath.ac.uk) are allowed' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    res.status(400).json({ error: authError.message });
    return;
  }

  const { error: profileError } = await supabase.from('users').upsert({
    id: authData.user.id,
    email,
    first_name,
    last_name,
    role: 'student',
  }, { onConflict: 'id' });

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    res.status(500).json({ error: `Failed to create user profile: ${profileError.message}` });
    return;
  }

  res.status(201).json({ message: 'Account created successfully. You can now sign in.' });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    res.status(401).json({ error: error.message });
    return;
  }

  res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  // JWT is stateless — client should discard the token.
  // Optionally revoke via admin API if needed.
  res.json({ message: 'Logged out successfully' });
}
