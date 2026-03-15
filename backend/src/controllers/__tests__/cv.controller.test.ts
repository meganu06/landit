// cv.controller.test.ts

jest.mock('../../supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  },
}));

jest.mock('../../services/anonymizer.service', () => ({
  anonymize: jest.fn((text: string) => text),
}));

jest.mock('../../services/matching.service', () => ({
  runMatchingForUser: jest.fn(),
}));

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: { completions: { create: jest.fn() } },
  }));
});

import { uploadCV, extractSkills, getMyCV } from '../cv.controller';
import { supabase } from '../../supabase/client';
import { runMatchingForUser } from '../../services/matching.service';
import OpenAI from 'openai';

const mockFrom = supabase.from as jest.Mock;
const mockStorageFrom = supabase.storage.from as jest.Mock;
const mockRunMatching = runMatchingForUser as jest.Mock;

function mockReqRes(overrides: object = {}) {
  const req: any = {
    user: { id: 'user-123' },
    body: {},
    params: {},
    file: null,
    ...overrides,
  };
  const res: any = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

// ─────────────────────────────────────────────────────────────────────────────
// uploadCV
// ─────────────────────────────────────────────────────────────────────────────
describe('uploadCV', () => {
  it('returns 400 if no file uploaded', async () => {
    const { req, res } = mockReqRes({ file: null });
    await uploadCV(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'No file uploaded' });
  });

  it('returns 400 if file type is not PDF or DOCX', async () => {
    const { req, res } = mockReqRes({
      file: {
        originalname: 'cv.txt',
        buffer: Buffer.from(''),
        size: 100,
        mimetype: 'text/plain',
      },
    });
    await uploadCV(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Only PDF and DOCX files are accepted' });
  });

  it('returns 500 if storage upload fails', async () => {
    mockStorageFrom.mockReturnValue({
      upload: jest.fn().mockResolvedValue({ error: { message: 'Storage error' } }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'http://url' } }),
    });
    const { req, res } = mockReqRes({
      file: {
        originalname: 'cv.pdf',
        buffer: Buffer.from(''),
        size: 1000,
        mimetype: 'application/pdf',
      },
    });
    await uploadCV(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Storage upload failed') })
    );
  });

  it('returns 500 if DB insert fails', async () => {
    mockStorageFrom.mockReturnValue({
      upload: jest.fn().mockResolvedValue({ error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'http://url' } }),
    });
    mockFrom.mockImplementation(() => ({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB insert failed' } }),
    }));
    const { req, res } = mockReqRes({
      file: {
        originalname: 'cv.pdf',
        buffer: Buffer.from(''),
        size: 1000,
        mimetype: 'application/pdf',
      },
    });
    await uploadCV(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'DB insert failed' });
  });

  it('returns 201 with CV data on success', async () => {
    const fakeCV = { id: 'cv-1', file_name: 'cv.pdf' };
    mockStorageFrom.mockReturnValue({
      upload: jest.fn().mockResolvedValue({ error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'http://url' } }),
    });
    mockFrom.mockImplementation(() => ({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: fakeCV, error: null }),
    }));
    const { req, res } = mockReqRes({
      file: {
        originalname: 'cv.pdf',
        buffer: Buffer.from(''),
        size: 1000,
        mimetype: 'application/pdf',
      },
    });
    await uploadCV(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(fakeCV);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// extractSkills
// ─────────────────────────────────────────────────────────────────────────────
describe('extractSkills', () => {
  const mockOpenAIInstance = {
    chat: { completions: { create: jest.fn() } },
  };

  beforeEach(() => {
    (OpenAI as unknown as jest.Mock).mockImplementation(() => mockOpenAIInstance);
    mockRunMatching.mockResolvedValue(undefined);
  });

  it('returns 400 if no text provided', async () => {
    const { req, res } = mockReqRes({ body: {} });
    await extractSkills(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'No CV text provided' });
  });

  it('returns 400 if text is too short', async () => {
    const { req, res } = mockReqRes({ body: { text: 'short' } });
    await extractSkills(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 500 if OpenAI throws', async () => {
    mockOpenAIInstance.chat.completions.create.mockRejectedValue(new Error('OpenAI down'));
    const { req, res } = mockReqRes({ body: { text: 'a'.repeat(50) } });
    await extractSkills(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('OpenAI extraction failed') })
    );
  });

  it('returns empty skills array when OpenAI returns empty array', async () => {
    mockOpenAIInstance.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: '[]' } }],
    });
    const { req, res } = mockReqRes({ body: { text: 'a'.repeat(50) } });
    await extractSkills(req, res);
    expect(res.json).toHaveBeenCalledWith({ skills: [] });
  });

  it('saves skills and triggers matching on success', async () => {
    mockOpenAIInstance.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: '["React","TypeScript"]' } }],
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'skills') {
        return {
          select: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'skill-1', name: 'React' } }),
        };
      }
      if (table === 'student_skills') {
        return {
          upsert: jest.fn().mockResolvedValue({ error: null }),
        };
      }
    });
    const { req, res } = mockReqRes({ body: { text: 'a'.repeat(50) } });
    await extractSkills(req, res);
    expect(mockRunMatching).toHaveBeenCalledWith('user-123');
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ skills: expect.any(Array) })
    );
  });

  it('does not fail if auto-matching throws', async () => {
    mockOpenAIInstance.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: '["React"]' } }],
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'skills') {
        return {
          select: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'skill-1', name: 'React' } }),
        };
      }
      if (table === 'student_skills') {
        return { upsert: jest.fn().mockResolvedValue({ error: null }) };
      }
    });
    mockRunMatching.mockRejectedValue(new Error('Matching failed'));
    const { req, res } = mockReqRes({ body: { text: 'a'.repeat(50) } });
    await extractSkills(req, res);
    // should still return skills despite matching failure
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ skills: expect.any(Array) })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getMyCV
// ─────────────────────────────────────────────────────────────────────────────
describe('getMyCV', () => {
  it('returns CV on success', async () => {
    const fakeCV = { id: 'cv-1', file_name: 'cv.pdf' };
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: fakeCV, error: null }),
    }));
    const { req, res } = mockReqRes();
    await getMyCV(req, res);
    expect(res.json).toHaveBeenCalledWith(fakeCV);
  });

  it('returns 500 on DB error', async () => {
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    }));
    const { req, res } = mockReqRes();
    await getMyCV(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
  });

  it('returns 404 when no CV found', async () => {
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    }));
    const { req, res } = mockReqRes();
    await getMyCV(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'No CV found' });
  });
});