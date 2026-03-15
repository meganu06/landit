// placement.controller.test.ts

jest.mock('../../supabase/client', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  }));
});

import {
  getPlacements,
  getPlacementById,
  createPlacement,
  updatePlacement,
  deletePlacement,
  extractPlacementSkills,
} from '../placement.controller';
import { supabase } from '../../supabase/client';
import OpenAI from 'openai';

const mockFrom = supabase.from as jest.Mock;

function mockReqRes(overrides: object = {}) {
  const req: any = {
    user: { id: 'user-123' },
    query: {},
    params: {},
    body: {},
    ...overrides,
  };
  const res: any = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

// ─────────────────────────────────────────────────────────────────────────────
// getPlacements
// ─────────────────────────────────────────────────────────────────────────────
describe('getPlacements', () => {
  it('returns placements on success', async () => {
    const fakePlacements = [{ id: '1', title: 'SWE Intern' }];
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: fakePlacements, error: null }),
    }));
    const { req, res } = mockReqRes();
    await getPlacements(req, res);
    expect(res.json).toHaveBeenCalledWith(fakePlacements);
  });

  it('returns 500 on DB error', async () => {
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    }));
    const { req, res } = mockReqRes();
    await getPlacements(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPlacementById
// ─────────────────────────────────────────────────────────────────────────────
describe('getPlacementById', () => {
  it('returns placement when found', async () => {
    const fakePlacement = { id: 'p-1', title: 'SWE' };
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: fakePlacement, error: null }),
    }));
    const { req, res } = mockReqRes({ params: { id: 'p-1' } });
    await getPlacementById(req, res);
    expect(res.json).toHaveBeenCalledWith(fakePlacement);
  });

  it('returns 404 when placement not found', async () => {
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    }));
    const { req, res } = mockReqRes({ params: { id: 'p-999' } });
    await getPlacementById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Placement not found' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createPlacement
// ─────────────────────────────────────────────────────────────────────────────
describe('createPlacement', () => {
  const validBody = {
    company_id: 'c-1',
    role_name: 'SWE Intern',
    description: 'Build stuff',
    location: 'London',
  };

  it('returns 400 if required fields are missing', async () => {
    const { req, res } = mockReqRes({ body: { company_id: 'c-1' } });
    await createPlacement(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
  });

  it('returns 201 with created placement on success', async () => {
    const created = { id: 'p-new', ...validBody };
    mockFrom.mockImplementation(() => ({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: created, error: null }),
    }));
    const { req, res } = mockReqRes({ body: validBody });
    await createPlacement(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(created);
  });

  it('returns 500 on DB error', async () => {
    mockFrom.mockImplementation(() => ({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
    }));
    const { req, res } = mockReqRes({ body: validBody });
    await createPlacement(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insert failed' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updatePlacement
// ─────────────────────────────────────────────────────────────────────────────
describe('updatePlacement', () => {
  it('returns updated placement on success', async () => {
    const updated = { id: 'p-1', title: 'Updated Role' };
    mockFrom.mockImplementation(() => ({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: updated, error: null }),
    }));
    const { req, res } = mockReqRes({
      params: { id: 'p-1' },
      body: { title: 'Updated Role' },
    });
    await updatePlacement(req, res);
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  it('returns 500 on DB error', async () => {
    mockFrom.mockImplementation(() => ({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } }),
    }));
    const { req, res } = mockReqRes({ params: { id: 'p-1' }, body: {} });
    await updatePlacement(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deletePlacement
// ─────────────────────────────────────────────────────────────────────────────
describe('deletePlacement', () => {
  it('returns success message on deactivation', async () => {
    mockFrom.mockImplementation(() => ({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    }));
    const { req, res } = mockReqRes({ params: { id: 'p-1' } });
    await deletePlacement(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Placement deactivated' });
  });

  it('returns 500 on DB error', async () => {
    mockFrom.mockImplementation(() => ({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
    }));
    const { req, res } = mockReqRes({ params: { id: 'p-1' } });
    await deletePlacement(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Delete failed' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// extractPlacementSkills
// ─────────────────────────────────────────────────────────────────────────────
describe('extractPlacementSkills', () => {
  const mockOpenAIInstance = {
    chat: { completions: { create: jest.fn() } },
  };

  beforeEach(() => {
    (OpenAI as unknown as jest.Mock).mockImplementation(() => mockOpenAIInstance);
  });

  it('returns 400 if description or placementId missing', async () => {
    const { req, res } = mockReqRes({ body: { description: 'some desc' } });
    await extractPlacementSkills(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 500 if OpenAI throws', async () => {
    mockOpenAIInstance.chat.completions.create.mockRejectedValue(
      new Error('OpenAI down')
    );
    const { req, res } = mockReqRes({
      body: { description: 'Build APIs with Node.js', placementId: 'p-1' },
    });
    await extractPlacementSkills(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('OpenAI extraction failed') })
    );
  });

  it('returns empty skills array when OpenAI returns empty array', async () => {
    mockOpenAIInstance.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: '[]' } }],
    });
    const { req, res } = mockReqRes({
      body: { description: 'some job', placementId: 'p-1' },
    });
    // mock the delete call even though no inserts follow
    mockFrom.mockImplementation(() => ({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    }));
    await extractPlacementSkills(req, res);
    expect(res.json).toHaveBeenCalledWith({ skills: [] });
  });

  it('saves extracted skills and returns them', async () => {
    const extracted = [
      { name: 'React', importance: 'required' },
      { name: 'Docker', importance: 'preferred' },
    ];
    mockOpenAIInstance.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(extracted) } }],
    });

    // skill already exists for React, needs to be created for Docker
    mockFrom.mockImplementation((table: string) => {
      if (table === 'placement_skills') {
        return {
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null }),
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === 'skills') {
        return {
          select: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'skill-1' } }),
          insert: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { id: 'skill-new' } }),
        };
      }
    });

    const { req, res } = mockReqRes({
      body: { description: 'Build with React and Docker', placementId: 'p-1' },
    });
    await extractPlacementSkills(req, res);
    expect(res.json).toHaveBeenCalledWith({
      skills: expect.arrayContaining([
        expect.objectContaining({ name: 'React' }),
        expect.objectContaining({ name: 'Docker' }),
      ]),
    });
  });
});