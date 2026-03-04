// backend/src/services/cv-parser.service.ts
import fs from "fs";
// pdf-parse has broken typings; import via require and cast to any so we can call it
const pdfParse: any = require("pdf-parse");
import mammoth from "mammoth";
import nlp from "compromise";

/**
 * pull text out of a PDF or DOCX (add more formats if you need them).
 */
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

/**
 * simple anonymiser that uses compromise’s built‑in tags plus a few regexes.
 */
export function anonymize(text: string): string {
  const doc = nlp(text);

  // replace named entities recognised by compromise
  doc.match("#Person").replaceWith("<PERSON>");
  doc.match("#Date").replaceWith("<DATE>");
  doc.match("#Place").replaceWith("<PLACE>");
  doc.match("#Email").replaceWith("<EMAIL>");

  // things the tagger doesn’t catch
  return doc
    .text()
    .replace(/\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, "<SSN>")
    .replace(/\b\d{10,}\b/g, "<PHONE>")
    .replace(/https?:\/\/\S+/gi, "<URL>");
}

export async function parseCv(filePath: string): Promise<string> {
  const raw = await extractTextFromFile(filePath);
  return anonymize(raw);
}