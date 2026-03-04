/*import { … } from "../../../shared/types/…";
import { querySomething } from "../database/queries";
import { SomeDbType } from "../database/types";
import { calculateGap } from "../services/gap-analysis.service";*/

import { Request, Response } from "express";
// backend/src/services/gap-analysis.service.ts
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// The LLM should ideally output a list of skills with no repeats, in lemmatized, lowercase fomr.
async function extractSkills(text: string): Promise<string[]> {
  const prompt = `
You are an expert at reading resumes and job descriptions.
Given an arbitrary piece of text, extract every skill, technology,
tool, technique or personal quality that could be relevant to an
employer.  Normalize words by lemmatisation (e.g. "programming",
"programmed" → "program") and output a JSON array of unique,
lowercase strings.

Examples:
Text: "I built React.js apps with TypeScript and Node.  Familiar with
MongoDB and agile methodologies."
Output: ["react.js","typescript","node","mongodb","agile"]

Text: "Skilled in programming, problem‑solving and communication."
Output: ["program","problem solving","communication"]

Now analyse this text:
\"\"\"
${text}
\"\"\"
Return only the JSON array.
`;

  const resp = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
    max_output_tokens: 500,
  });

  // the model may wrap the array in quotes or text; attempt to parse safely
  let raw = resp.output_text || "";
  raw = raw.trim();
  try {
    return JSON.parse(raw);
  } catch (err) {
    // fall back to crude regex extraction
    const match = raw.match(/\[.*\]/s);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("failed to parse skills from model output: " + raw);
  }
}

// Apply skill extraction to both job description and CV, and compare the extracted skills to find gaps.
export async function findGaps(
  cvText: string,
  jobText: string
): Promise<{ cvSkills: string[]; jobSkills: string[]; missing: string[] }> {
  const [cvSkills, jobSkills] = await Promise.all([
    extractSkills(cvText),
    extractSkills(jobText),
  ]);

  const cvSet = new Set(cvSkills);
  const missing = jobSkills.filter((s) => !cvSet.has(s));

  return { cvSkills, jobSkills, missing };
}

// This function takes the missing skills and wraps them up in a more verbose explanation via LLM.
export async function describeGap(missing: string[]): Promise<string> {
  if (missing.length === 0) return "No gaps – the CV covers all required skills!";
  const resp = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: `The candidate does not mention the following skills:\n\n${missing
      .map((s) => "- " + s)
      .join("\n")}\n\nWrite a single polite paragraph that a career advisor
might send to the candidate explaining the missing skills. Do research if necessary and find the 
top resources on the internet for it. For example, The Odin Project for web development, Ruby, 
and Javascript. In this manner list every missing skill and provide at least one resource (with a link)
to acquire that skill.`,
  });
  return resp.output_text;
}