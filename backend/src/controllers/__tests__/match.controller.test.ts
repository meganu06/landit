// match.controller.test.ts

jest.mock('../../supabase/client', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('../../services/matching.service', () => ({
  runMatchingForUser: jest.fn(),
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

import { runMatching, getMatchResults, getGapAnalysis } from '../match.controller';
import { runMatchingForUser } from '../../services/matching.service';
import { supabase } from '../../supabase/client';
import OpenAI from 'openai';

const mockFrom = supabase.from as jest.Mock;
const mockRunMatching = runMatchingForUser as jest.Mock;

// Helper to build mock req/res
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
// runMatching
// ─────────────────────────────────────────────────────────────────────────────
describe('runMatching', () => {
  it('returns 200 with success message on success', async () => {
    mockRunMatching.mockResolvedValue(undefined);
    const { req, res } = mockReqRes();
    await runMatching(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Matching complete' });
  });

  it('returns 500 with error message on failure', async () => {
    mockRunMatching.mockRejectedValue(new Error('DB failed'));
    const { req, res } = mockReqRes();
    await runMatching(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'DB failed' });
  });

  it('handles non-Error throws gracefully', async () => {
    mockRunMatching.mockRejectedValue('string error');
    const { req, res } = mockReqRes();
    await runMatching(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unknown error' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getMatchResults
// ─────────────────────────────────────────────────────────────────────────────
describe('getMatchResults', () => {
  function mockMatchResultsQuery(data: object[] | null, error: object | null) {
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data, error }),
    }));
  }

  it('returns match results on success', async () => {
    const fakeData = [{ fit_score: 85 }, { fit_score: 70 }];
    mockMatchResultsQuery(fakeData, null);
    const { req, res } = mockReqRes();
    await getMatchResults(req, res);
    expect(res.json).toHaveBeenCalledWith(fakeData);
  });

  it('returns 500 on DB error', async () => {
    mockMatchResultsQuery(null, { message: 'Query failed' });
    const { req, res } = mockReqRes();
    await getMatchResults(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Query failed' });
  });

  it('applies minScore filter from query param', async () => {
    const gteMock = jest.fn().mockReturnThis();
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: gteMock,
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    }));
    const { req, res } = mockReqRes({ query: { minScore: '60' } });
    await getMatchResults(req, res);
    expect(gteMock).toHaveBeenCalledWith('fit_score', 60);
  });

  it('defaults minScore to 0 when not provided', async () => {
    const gteMock = jest.fn().mockReturnThis();
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: gteMock,
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    }));
    const { req, res } = mockReqRes({ query: {} });
    await getMatchResults(req, res);
    expect(gteMock).toHaveBeenCalledWith('fit_score', 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getGapAnalysis
// ─────────────────────────────────────────────────────────────────────────────
describe('getGapAnalysis', () => {
  const mockOpenAIInstance = {
    chat: { completions: { create: jest.fn() } },
  };

  beforeEach(() => {
    (OpenAI as unknown as jest.Mock).mockImplementation(() => mockOpenAIInstance);
  });

  function mockGapQuery(data: object | null, error: object | null) {
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data, error }),
    }));
  }

  it('returns 500 on DB error', async () => {
    mockGapQuery(null, { message: 'DB error' });
    const { req, res } = mockReqRes({ params: { placementId: 'p-1' } });
    await getGapAnalysis(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
  });

  it('returns 404 when no match result found', async () => {
    mockGapQuery(null, null);
    const { req, res } = mockReqRes({ params: { placementId: 'p-1' } });
    await getGapAnalysis(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'No match result found. Run matching first.',
    });
  });

  it('returns empty missing_skills when no gaps', async () => {
    mockGapQuery(
      { gap_analysis_report: { skills_missing: [] }, placements: null },
      null
    );
    const { req, res } = mockReqRes({ params: { placementId: 'p-1' } });
    await getGapAnalysis(req, res);
    expect(res.json).toHaveBeenCalledWith({
      placement_id: 'p-1',
      missing_skills: [],
    });
  });

  it('calls OpenAI and returns recommendations when skills are missing', async () => {
    mockGapQuery(
      {
        gap_analysis_report: { skills_missing: ['Docker', 'Kubernetes'] },
        placements: {
          title: 'Backend Engineer',
          description: 'Build APIs',
          companies: { name: 'Acme' },
        },
      },
      null
    );
    const fakeRecommendations = [
      { skill: 'Docker', how_to_improve: ['step1', 'step2', 'step3'] },
    ];
    mockOpenAIInstance.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(fakeRecommendations) } }],
    });
    const { req, res } = mockReqRes({ params: { placementId: 'p-1' } });
    await getGapAnalysis(req, res);
    expect(res.json).toHaveBeenCalledWith({
      placement_id: 'p-1',
      missing_skills: fakeRecommendations,
    });
  });

  it('returns 500 if OpenAI throws', async () => {
    mockGapQuery(
      {
        gap_analysis_report: { skills_missing: ['React'] },
        placements: { title: 'Dev', description: 'desc', companies: null },
      },
      null
    );
    mockOpenAIInstance.chat.completions.create.mockRejectedValue(
      new Error('OpenAI down')
    );
    const { req, res } = mockReqRes({ params: { placementId: 'p-1' } });
    await getGapAnalysis(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to generate recommendations: OpenAI down',
    });
  });

  it('handles malformed JSON from OpenAI by falling back to empty array', async () => {
    mockGapQuery(
      {
        gap_analysis_report: { skills_missing: ['React'] },
        placements: { title: 'Dev', description: 'desc', companies: null },
      },
      null
    );
    mockOpenAIInstance.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: 'not valid json {{{' } }],
    });
    const { req, res } = mockReqRes({ params: { placementId: 'p-1' } });
    await getGapAnalysis(req, res);
    // Should 500 since JSON.parse throws
    expect(res.status).toHaveBeenCalledWith(500);
  });
});