// bookmark.controller.test.ts

jest.mock('../../supabase/client', () => ({
  supabase: { from: jest.fn() },
}));

import { addBookmark, removeBookmark, getBookmarks } from '../bookmark.controller';
import { supabase } from '../../supabase/client';

const mockFrom = supabase.from as jest.Mock;

function mockReqRes(overrides: object = {}) {
  const req: any = {
    user: { id: 'user-123' },
    params: {},
    ...overrides,
  };
  const res: any = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

// ─────────────────────────────────────────────────────────────────────────────
// addBookmark
// ─────────────────────────────────────────────────────────────────────────────
describe('addBookmark', () => {
  it('returns 201 with bookmark on success', async () => {
    const fakeBookmark = { id: 'b-1', placement_id: 'p-1', user_id: 'user-123' };
    mockFrom.mockImplementation(() => ({
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: fakeBookmark, error: null }),
    }));
    const { req, res } = mockReqRes({ params: { placementId: 'p-1' } });
    await addBookmark(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(fakeBookmark);
  });

  it('returns 500 on DB error', async () => {
    mockFrom.mockImplementation(() => ({
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Upsert failed' } }),
    }));
    const { req, res } = mockReqRes({ params: { placementId: 'p-1' } });
    await addBookmark(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Upsert failed' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// removeBookmark
// ─────────────────────────────────────────────────────────────────────────────
describe('removeBookmark', () => {
  it('returns success message on removal', async () => {
    mockFrom.mockImplementation(() => ({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }));
    // last eq call resolves
    mockFrom.mockImplementation(() => ({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnValueOnce({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    }));
    const { req, res } = mockReqRes({ params: { placementId: 'p-1' } });
    await removeBookmark(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Bookmark removed' });
  });

  it('returns 500 on DB error', async () => {
    mockFrom.mockImplementation(() => ({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnValueOnce({
        eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
      }),
    }));
    const { req, res } = mockReqRes({ params: { placementId: 'p-1' } });
    await removeBookmark(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Delete failed' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getBookmarks
// ─────────────────────────────────────────────────────────────────────────────
describe('getBookmarks', () => {
  it('returns bookmarks on success', async () => {
    const fakeBookmarks = [{ id: 'b-1' }, { id: 'b-2' }];
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: fakeBookmarks, error: null }),
    }));
    const { req, res } = mockReqRes();
    await getBookmarks(req, res);
    expect(res.json).toHaveBeenCalledWith(fakeBookmarks);
  });

  it('returns 500 on DB error', async () => {
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Fetch failed' } }),
    }));
    const { req, res } = mockReqRes();
    await getBookmarks(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Fetch failed' });
  });
});