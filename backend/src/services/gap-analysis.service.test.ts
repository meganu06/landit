import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- module mocks ----------

// Variables prefixed "mock" can be referenced inside vi.mock factories (vitest hoisting rule).
const mockCreate = vi.fn();

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

import { findGaps, describeGap } from "./gap-analysis.service";

// ----------------------------------

/** Helper: make mockCreate return a chat completion with the given text content. */
function mockCompletion(content: string) {
  return {
    choices: [{ message: { content } }],
  };
}

describe("describeGap()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns early without calling the API when missing list is empty", async () => {
    const result = await describeGap([]);

    expect(result).toBe("No gaps – the CV covers all required skills!");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("calls the API once and returns the model's response text", async () => {
    const advice = "You should learn Docker. See https://docs.docker.com.";
    mockCreate.mockResolvedValueOnce(mockCompletion(advice));

    const result = await describeGap(["docker", "kubernetes"]);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(result).toBe(advice);
  });

  it("includes each missing skill in the prompt sent to the API", async () => {
    mockCreate.mockResolvedValueOnce(mockCompletion("Some advice"));

    await describeGap(["rust", "wasm"]);

    const calledWith = mockCreate.mock.calls[0][0];
    const promptText = calledWith.messages[0].content as string;
    expect(promptText).toContain("rust");
    expect(promptText).toContain("wasm");
  });

  it("handles a null/empty API response gracefully", async () => {
    mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: null } }] });

    const result = await describeGap(["python"]);

    expect(result).toBe("");
  });
});

describe("findGaps()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns skills missing from the CV that appear in the job description", async () => {
    // First call → CV skills, second call → job skills
    mockCreate
      .mockResolvedValueOnce(mockCompletion('["react","typescript","node"]'))
      .mockResolvedValueOnce(mockCompletion('["react","typescript","docker","kubernetes"]'));

    const { cvSkills, jobSkills, missing } = await findGaps("cv text", "job text");

    expect(cvSkills).toEqual(["react", "typescript", "node"]);
    expect(jobSkills).toEqual(["react", "typescript", "docker", "kubernetes"]);
    expect(missing).toEqual(["docker", "kubernetes"]);
  });

  it("returns empty missing array when CV covers all job skills", async () => {
    mockCreate
      .mockResolvedValueOnce(mockCompletion('["python","sql","docker"]'))
      .mockResolvedValueOnce(mockCompletion('["python","sql"]'));

    const { missing } = await findGaps("cv text", "job text");

    expect(missing).toHaveLength(0);
  });

  it("returns all job skills as missing when CV is empty", async () => {
    mockCreate
      .mockResolvedValueOnce(mockCompletion("[]"))
      .mockResolvedValueOnce(mockCompletion('["java","spring","aws"]'));

    const { missing } = await findGaps("empty cv", "job text");

    expect(missing).toEqual(["java", "spring", "aws"]);
  });

  it("makes exactly two API calls (one per text input)", async () => {
    mockCreate
      .mockResolvedValueOnce(mockCompletion('["react"]'))
      .mockResolvedValueOnce(mockCompletion('["react"]'));

    await findGaps("cv", "job");

    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("falls back to regex extraction when model wraps output in markdown", async () => {
    // Model sometimes returns ```json\n[...]\n``` — the fallback regex handles it
    mockCreate
      .mockResolvedValueOnce(mockCompletion('```json\n["python"]\n```'))
      .mockResolvedValueOnce(mockCompletion('["python","rust"]'));

    const { missing } = await findGaps("cv", "job");

    expect(missing).toEqual(["rust"]);
  });

  it("throws a descriptive error when the model returns unparseable output", async () => {
    mockCreate
      .mockResolvedValueOnce(mockCompletion("Sorry, I cannot help with that."))
      .mockResolvedValueOnce(mockCompletion('["python"]'));

    await expect(findGaps("cv", "job")).rejects.toThrow(
      "failed to parse skills from model output"
    );
  });
});
