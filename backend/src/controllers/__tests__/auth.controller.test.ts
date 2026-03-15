// auth.controller.test.ts

jest.mock('../../supabase/client', () => ({
  supabase: {
    auth: {
      admin: {
        createUser: jest.fn(),
        deleteUser: jest.fn(),
      },
      signInWithPassword: jest.fn(),
    },
    from: jest.fn(),
  },
}));

import { register, login, logout } from '../auth.controller';
import { supabase } from '../../supabase/client';

const mockCreateUser = supabase.auth.admin.createUser as jest.Mock;
const mockDeleteUser = supabase.auth.admin.deleteUser as jest.Mock;
const mockSignIn = supabase.auth.signInWithPassword as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

function mockReqRes(overrides: object = {}) {
  const req: any = { body: {}, ...overrides };
  const res: any = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

// ─────────────────────────────────────────────────────────────────────────────
// register
// ─────────────────────────────────────────────────────────────────────────────
describe('register', () => {
  const validBody = {
    email: 'ab1234@bath.ac.uk',
    password: 'password123',
    first_name: 'Alice',
    last_name: 'Smith',
  };

  it('returns 400 if required fields are missing', async () => {
    const { req, res } = mockReqRes({ body: { email: 'ab1234@bath.ac.uk' } });
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
  });

  it('returns 400 if email is not a bath.ac.uk address', async () => {
    const { req, res } = mockReqRes({
      body: { ...validBody, email: 'alice@gmail.com' },
    });
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('@bath.ac.uk') })
    );
  });

  it('returns 400 if password is too short', async () => {
    const { req, res } = mockReqRes({
      body: { ...validBody, password: 'abc' },
    });
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('6 characters') })
    );
  });

  it('returns 400 if Supabase auth creation fails', async () => {
    mockCreateUser.mockResolvedValue({
      data: null,
      error: { message: 'Email already in use' },
    });
    const { req, res } = mockReqRes({ body: validBody });
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Email already in use' });
  });

  it('returns 500 and deletes auth user if profile creation fails', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: 'u-1' } },
      error: null,
    });
    mockDeleteUser.mockResolvedValue({});
    mockFrom.mockImplementation(() => ({
      upsert: jest.fn().mockResolvedValue({ error: { message: 'Profile insert failed' } }),
    }));
    const { req, res } = mockReqRes({ body: validBody });
    await register(req, res);
    expect(mockDeleteUser).toHaveBeenCalledWith('u-1');
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns 201 on successful registration', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: 'u-1' } },
      error: null,
    });
    mockFrom.mockImplementation(() => ({
      upsert: jest.fn().mockResolvedValue({ error: null }),
    }));
    const { req, res } = mockReqRes({ body: validBody });
    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Account created') })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// login
// ─────────────────────────────────────────────────────────────────────────────
describe('login', () => {
  it('returns 400 if email or password missing', async () => {
    const { req, res } = mockReqRes({ body: { email: 'ab1234@bath.ac.uk' } });
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'email and password are required' });
  });

  it('returns 401 if credentials are invalid', async () => {
    mockSignIn.mockResolvedValue({ data: null, error: { message: 'Invalid credentials' } });
    const { req, res } = mockReqRes({ body: { email: 'ab1234@bath.ac.uk', password: 'wrong' } });
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
  });

  it('returns tokens and user on successful login', async () => {
    mockSignIn.mockResolvedValue({
      data: {
        session: { access_token: 'tok-a', refresh_token: 'tok-r' },
        user: { id: 'u-1', email: 'ab1234@bath.ac.uk' },
      },
      error: null,
    });
    const { req, res } = mockReqRes({
      body: { email: 'ab1234@bath.ac.uk', password: 'password123' },
    });
    await login(req, res);
    expect(res.json).toHaveBeenCalledWith({
      access_token: 'tok-a',
      refresh_token: 'tok-r',
      user: { id: 'u-1', email: 'ab1234@bath.ac.uk' },
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// logout
// ─────────────────────────────────────────────────────────────────────────────
describe('logout', () => {
  it('returns success message', async () => {
    const { req, res } = mockReqRes();
    await logout(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
  });
});