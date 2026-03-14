// matching.service.test.ts
// Tests for calculateMatchScore and skillMatches logic.
// Supabase is mocked so no real DB connection is needed.

jest.mock('../../supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Pull out the pure functions via re-export trick —
// since they are not exported we test behaviour through observable outputs.
// We import runMatchingForUser to test the DB-integrated path separately.
import { runMatchingForUser } from '../matching.service';
import { supabase } from '../../supabase/client';

const mockFrom = supabase.from as jest.Mock;

// ─── Helper to build placement skill rows ────────────────────────────────────
function req(name: string) {
  return { importance: 'required', skills: { name } };
}
function pref(name: string) {
  return { importance: 'preferred', skills: { name } };
}
function skill(name: string) {
  return { name };
}

// ─── Re-expose calculateMatchScore for unit testing ──────────────────────────
// Because calculateMatchScore is not exported we test it indirectly by
// mocking Supabase and inspecting what gets inserted into match_results.
// Each test controls the skills returned and asserts on the inserted fit_score.

function mockSupabaseRun(userSkills: { name: string }[], placementSkills: object[]) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'student_skills') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: userSkills.map(s => ({ skills: s })),
          error: null,
        }),
      };
    }
    if (table === 'placements') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 'placement-1', placement_skills: placementSkills }],
          error: null,
        }),
      };
    }
    if (table === 'match_results') {
      return {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
        insert: jest.fn().mockImplementation((rows: object[]) =>
          Promise.resolve({ data: rows, error: null })
        ),
      };
    }
  });
}

// ─── Capture what was inserted ───────────────────────────────────────────────
async function getInsertedRow(userSkills: { name: string }[], placementSkills: object[]) {
  mockSupabaseRun(userSkills, placementSkills);
  let inserted: { fit_score: number; gap_analysis_report: { skills_matched: string[]; skills_missing: string[] } }[] = [];
  mockFrom.mockImplementation((table: string) => {
    if (table === 'student_skills') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: userSkills.map(s => ({ skills: s })),
          error: null,
        }),
      };
    }
    if (table === 'placements') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 'placement-1', placement_skills: placementSkills }],
          error: null,
        }),
      };
    }
    if (table === 'match_results') {
      return {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
        insert: jest.fn().mockImplementation((rows: typeof inserted) => {
          inserted = rows;
          return Promise.resolve({ error: null });
        }),
      };
    }
  });
  await runMatchingForUser('user-123');
  return inserted[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// MATCH SCORING
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateMatchScore — required skills', () => {
  it('scores 100 when student has all required skills', async () => {
    const row = await getInsertedRow(
      [skill('React'), skill('TypeScript'), skill('Node.js')],
      [req('React'), req('TypeScript'), req('Node.js')]
    );
    expect(row.fit_score).toBe(100);
  });

  it('scores 0 when student has no skills at all', async () => {
    const row = await getInsertedRow(
      [],
      [req('React'), req('Python')]
    );
    expect(row.fit_score).toBe(0);
  });

  it('scores 0 when placement has no skills listed', async () => {
    const row = await getInsertedRow(
      [skill('React')],
      []
    );
    expect(row.fit_score).toBe(0);
  });

  it('scores > 0 when student has at least one required skill', async () => {
    const row = await getInsertedRow(
      [skill('React')],
      [req('React'), req('Python'), req('Docker')]
    );
    expect(row.fit_score).toBeGreaterThan(0);
  });

  it('caps score at 100', async () => {
    const row = await getInsertedRow(
      [skill('React'), skill('TypeScript'), skill('Node.js'), skill('Python')],
      [req('React'), req('TypeScript'), req('Node.js'), req('Python')]
    );
    expect(row.fit_score).toBeLessThanOrEqual(100);
  });

  it('score is never negative', async () => {
    const row = await getInsertedRow(
      [skill('Cobol')],
      [req('React'), req('Python')]
    );
    expect(row.fit_score).toBeGreaterThanOrEqual(0);
  });
});

describe('calculateMatchScore — preferred skills', () => {
  it('scores > 0 when student only matches preferred skills', async () => {
    const row = await getInsertedRow(
      [skill('Docker')],
      [pref('Docker'), pref('Kubernetes')]
    );
    expect(row.fit_score).toBeGreaterThan(0);
  });

  it('scores higher with preferred skills than without', async () => {
    const withPref = await getInsertedRow(
      [skill('React'), skill('Docker')],
      [req('React'), pref('Docker')]
    );
    const withoutPref = await getInsertedRow(
      [skill('React')],
      [req('React'), pref('Docker')]
    );
    expect(withPref.fit_score).toBeGreaterThanOrEqual(withoutPref.fit_score);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SKILL ALIASES
// ─────────────────────────────────────────────────────────────────────────────
describe('skillMatches — alias resolution', () => {
  it('matches "js" on CV to "javascript" on placement', async () => {
    const row = await getInsertedRow(
      [skill('js')],
      [req('javascript')]
    );
    expect(row.gap_analysis_report.skills_matched).toContain('javascript');
  });

  it('matches "ts" on CV to "typescript" on placement', async () => {
    const row = await getInsertedRow(
      [skill('ts')],
      [req('typescript')]
    );
    expect(row.gap_analysis_report.skills_matched).toContain('typescript');
  });

  it('matches "node" on CV to "node.js" on placement', async () => {
    const row = await getInsertedRow(
      [skill('node')],
      [req('node.js')]
    );
    expect(row.gap_analysis_report.skills_matched).toContain('node.js');
  });

  it('matches "postgres" on CV to "postgresql" on placement', async () => {
    const row = await getInsertedRow(
      [skill('postgres')],
      [req('postgresql')]
    );
    expect(row.gap_analysis_report.skills_matched).toContain('postgresql');
  });

  it('matches "cpp" on CV to "c++" on placement', async () => {
    const row = await getInsertedRow(
      [skill('cpp')],
      [req('c++')]
    );
    expect(row.gap_analysis_report.skills_matched).toContain('c++');
  });

  it('is case-insensitive', async () => {
    const row = await getInsertedRow(
      [skill('REACT')],
      [req('react')]
    );
    expect(row.gap_analysis_report.skills_matched).toContain('react');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GAP ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────
describe('gap analysis report', () => {
  it('lists missing required skills correctly', async () => {
    const row = await getInsertedRow(
      [skill('React')],
      [req('React'), req('Python'), req('Docker')]
    );
    expect(row.gap_analysis_report.skills_missing).toContain('Python');
    expect(row.gap_analysis_report.skills_missing).toContain('Docker');
  });

  it('does not list matched skills as missing', async () => {
    const row = await getInsertedRow(
      [skill('React'), skill('Python')],
      [req('React'), req('Python')]
    );
    expect(row.gap_analysis_report.skills_missing).toHaveLength(0);
  });

  it('does not include preferred skills in missing list', async () => {
    const row = await getInsertedRow(
      [skill('React')],
      [req('React'), pref('Docker')]
    );
    expect(row.gap_analysis_report.skills_missing).not.toContain('Docker');
  });

  it('includes matched skills in skills_matched', async () => {
    const row = await getInsertedRow(
      [skill('React'), skill('Python')],
      [req('React'), req('Python'), req('Docker')]
    );
    expect(row.gap_analysis_report.skills_matched).toContain('React');
    expect(row.gap_analysis_report.skills_matched).toContain('Python');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE INTEGRATION (runMatchingForUser)
// ─────────────────────────────────────────────────────────────────────────────
describe('runMatchingForUser — DB integration', () => {
  it('throws if student_skills query fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'student_skills') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        };
      }
    });
    await expect(runMatchingForUser('user-123')).rejects.toThrow('DB error');
  });

  it('throws if placements query fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'student_skills') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      if (table === 'placements') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'Placement fetch failed' } }),
        };
      }
    });
    await expect(runMatchingForUser('user-123')).rejects.toThrow('Placement fetch failed');
  });

  it('deletes existing match results before inserting new ones', async () => {
    const deleteMock = jest.fn().mockReturnThis();
    const eqMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'student_skills') {
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: [], error: null }) };
      }
      if (table === 'placements') {
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: [], error: null }) };
      }
      if (table === 'match_results') {
        return { delete: deleteMock, eq: eqMock, insert: jest.fn().mockResolvedValue({ error: null }) };
      }
    });
    await runMatchingForUser('user-123');
    expect(deleteMock).toHaveBeenCalled();
  });

  it('does not call insert when there are no active placements', async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'student_skills') {
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: [], error: null }) };
      }
      if (table === 'placements') {
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: [], error: null }) };
      }
      if (table === 'match_results') {
        return { delete: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ error: null }), insert: insertMock };
      }
    });
    await runMatchingForUser('user-123');
    expect(insertMock).not.toHaveBeenCalled();
  });
});