import fs from "fs";
// pdf-parse ships without proper TS types; cast via import so vitest can mock it cleanly.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import pdfParseLib from "pdf-parse";
const pdfParse = pdfParseLib as unknown as (buf: Buffer) => Promise<{ text: string }>;
import mammoth from "mammoth";
import nlp from "compromise";
import { parse } from "path";

// Extract text from a CV file, supporting both PDF and DOCX formats.
export async function extractTextFromFile(path: string): Promise<string> {
  const buf = await fs.promises.readFile(path);
  if (path.endsWith(".pdf")) {
    // pdf-parse's default export is a function that accepts a buffer
    const data = await pdfParse(buf);
    return data.text;
  }
  if (path.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer: buf });
    return result.value;
  }
  throw new Error("unsupported CV format: " + path);
}

// Simple text anonymizer, completely local
export function anonymize(text: string): string {
  // Run regex replacements first — numeric patterns like SSNs would otherwise be
  // mis-tagged as dates by compromise before we get a chance to replace them.
  const preProcessed = text
    .replace(/\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, "<SSN>")
    .replace(/\b\d{10,}\b/g, "<PHONE>")
    .replace(/https?:\/\/\S+/gi, "<URL>");

  // Then let compromise handle named entity recognition.
  const doc = nlp(preProcessed);
  doc.match("#Person").replaceWith("<PERSON>");
  doc.match("#Date").replaceWith("<DATE>");
  doc.match("#Place").replaceWith("<PLACE>");
  doc.match("#Email").replaceWith("<EMAIL>");

  return doc.text();
}

export async function parseCv(filePath: string): Promise<string> {
  const raw = await extractTextFromFile(filePath);
  return anonymize(raw);
}

console.log(parseCv("/Users/jishnu/Documents/Work/JishnuSingha1.pdf"));