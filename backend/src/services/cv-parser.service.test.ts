import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";

// ---------- module mocks ----------

vi.mock("pdf-parse", () => ({ default: vi.fn() }));

vi.mock("mammoth", () => ({
  default: { extractRawText: vi.fn() },
}));

// Spy on fs.promises.readFile — simpler than a vi.mock factory and avoids hoisting issues.
const mockReadFile = vi.spyOn(fs.promises, "readFile");

// Import mocked modules AFTER vi.mock declarations so we get the mock instances.
import pdfParseLib from "pdf-parse";
import mammoth from "mammoth";
import { anonymize, extractTextFromFile, parseCv } from "./cv-parser.service";

// Typed handles into the mocks.
const mockPdfParse = vi.mocked(pdfParseLib) as unknown as ReturnType<typeof vi.fn>;
const mockExtractRawText = vi.mocked(mammoth.extractRawText);

// ----------------------------------

describe("anonymize()", () => {
  it("replaces SSNs (dashed format)", () => {
    expect(anonymize("My SSN is 123-45-6789.")).toContain("<SSN>");
  });

  it("replaces SSNs (dotted format)", () => {
    expect(anonymize("SSN: 123.45.6789")).toContain("<SSN>");
  });

  it("replaces SSNs (no separator)", () => {
    expect(anonymize("SSN 123456789")).toContain("<SSN>");
  });

  it("replaces 10+ digit phone numbers", () => {
    expect(anonymize("Call me on 07911123456")).toContain("<PHONE>");
  });

  it("does NOT replace short numbers (fewer than 10 digits)", () => {
    expect(anonymize("My lucky number is 12345")).not.toContain("<PHONE>");
  });

  it("replaces http URLs", () => {
    expect(anonymize("Visit http://example.com for info")).toContain("<URL>");
  });

  it("replaces https URLs", () => {
    expect(anonymize("See https://github.com/user/repo")).toContain("<URL>");
  });

  it("leaves plain text without PII untouched", () => {
    const out = anonymize("I have experience with React and TypeScript.");
    expect(out).not.toContain("<SSN>");
    expect(out).not.toContain("<PHONE>");
    expect(out).not.toContain("<URL>");
  });

  it("handles empty string without throwing", () => {
    expect(() => anonymize("")).not.toThrow();
  });
});

// ----------------------------------

describe("extractTextFromFile()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFile.mockResolvedValue(Buffer.from("fake bytes") as any);
  });

  it("throws for unsupported file extensions", async () => {
    await expect(extractTextFromFile("/cv/resume.txt")).rejects.toThrow(
      "unsupported CV format"
    );
  });

  it("calls pdfParse for .pdf files and returns extracted text", async () => {
    mockPdfParse.mockResolvedValue({ text: "pdf content here" });

    const result = await extractTextFromFile("/tmp/resume.pdf");

    expect(mockReadFile).toHaveBeenCalledWith("/tmp/resume.pdf");
    expect(mockPdfParse).toHaveBeenCalled();
    expect(result).toBe("pdf content here");
  });

  it("calls mammoth for .docx files and returns extracted text", async () => {
    mockExtractRawText.mockResolvedValue({ value: "docx content here" } as any);

    const result = await extractTextFromFile("/tmp/resume.docx");

    expect(mockReadFile).toHaveBeenCalledWith("/tmp/resume.docx");
    expect(mockExtractRawText).toHaveBeenCalled();
    expect(result).toBe("docx content here");
  });

  it("propagates errors thrown by pdf-parse", async () => {
    mockPdfParse.mockRejectedValue(new Error("corrupt pdf"));

    await expect(extractTextFromFile("/tmp/bad.pdf")).rejects.toThrow("corrupt pdf");
  });
});

// ----------------------------------

describe("parseCv()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFile.mockResolvedValue(Buffer.from("fake bytes") as any);
  });

  it("returns anonymized text — URLs and SSNs are stripped", async () => {
    mockPdfParse.mockResolvedValue({
      text: "See https://linkedin.com/in/jsmith. SSN: 123-45-6789",
    });

    const result = await parseCv("/tmp/resume.pdf");

    expect(result).toContain("<URL>");
    expect(result).toContain("<SSN>");
    expect(result).not.toContain("linkedin.com");
    expect(result).not.toContain("123-45-6789");
  });
});
