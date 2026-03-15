// auth.middleware.test.ts
// Tests for requireAuth() and requireAdmin() middleware.
// Supabase is mocked so no real auth calls are made.

jest.mock('../../supabase/client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

import { Request, Response, NextFunction } from 'express';
import { requireAuth, requireAdmin, AuthRequest } from '../auth';
import { supabase } from '../../supabase/client';

const mockGetUser = supabase.auth.getUser as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function mockReq(authHeader?: string): AuthRequest {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  } as AuthRequest;
}

function mockRes(): { status: jest.Mock; json: jest.Mock } {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

const next: NextFunction = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// requireAuth
// ─────────────────────────────────────────────────────────────────────────────
describe('UT-026: requireAuth() validates Bearer JWT token', () => {
  it('returns 401 when no authorization header is provided', async () => {
    const req = mockReq();
    const res = mockRes();
    await requireAuth(req, res as unknown as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid authorization header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when authorization header does not start with Bearer', async () => {
    const req = mockReq('Basic sometoken');
    const res = mockRes();
    await requireAuth(req, res as unknown as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid authorization header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('AS-004: returns 401 when token is invalid or expired', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid token' } });
    const req = mockReq('Bearer invalidtoken');
    const res = mockRes();
    await requireAuth(req, res as unknown as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when getUser returns no user and no error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const req = mockReq('Bearer sometoken');
    const res = mockRes();
    await requireAuth(req, res as unknown as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches user to req and calls next() with valid token', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@bath.ac.uk' } },
      error: null,
    });
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'student' }, error: null }),
    }));
    const req = mockReq('Bearer validtoken');
    const res = mockRes();
    await requireAuth(req, res as unknown as Response, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: 'user-123', email: 'test@bath.ac.uk', role: 'student' });
  });

  it('defaults role to student when profile has no role', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-456', email: 'noroll@bath.ac.uk' } },
      error: null,
    });
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    }));
    const req = mockReq('Bearer validtoken');
    const res = mockRes();
    await requireAuth(req, res as unknown as Response, next);
    expect(req.user?.role).toBe('student');
    expect(next).toHaveBeenCalled();
  });

  it('attaches admin role when profile role is admin', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'admin-123', email: 'admin@bath.ac.uk' } },
      error: null,
    });
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
    }));
    const req = mockReq('Bearer admintoken');
    const res = mockRes();
    await requireAuth(req, res as unknown as Response, next);
    expect(req.user?.role).toBe('admin');
    expect(next).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireAdmin
// ─────────────────────────────────────────────────────────────────────────────
describe('AS-003: requireAdmin() protects admin-only routes', () => {
  it('returns 403 when user is not admin', () => {
    const req = { user: { id: 'user-123', email: 'test@bath.ac.uk', role: 'student' } } as AuthRequest;
    const res = mockRes();
    requireAdmin(req, res as unknown as Response, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Admin access required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when no user is attached to request', () => {
    const req = {} as AuthRequest;
    const res = mockRes();
    requireAdmin(req, res as unknown as Response, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when user role is admin', () => {
    const req = { user: { id: 'admin-123', email: 'admin@bath.ac.uk', role: 'admin' } } as AuthRequest;
    const res = mockRes();
    requireAdmin(req, res as unknown as Response, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});