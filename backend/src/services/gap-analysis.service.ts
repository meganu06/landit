import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Extracts a deduplicated list of lowercase canonical skill names from arbitrary text.
async function extractSkillNames(text: string): Promise<string[]> {
  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You extract skills from text. " +
          "Return a JSON array of unique, lowercase, canonical skill name strings — nothing else, no markdown fences. " +
          "Normalise to canonical form (e.g. 'React.js' → 'react', 'Node.js' → 'node', 'C#' → 'csharp'). " +
          "Include languages, frameworks, tools, cloud platforms, databases, and methodologies.",
      },
      {
        role: "user",
        content: text,
      },
    ],
    max_tokens: 500,
    temperature: 0, // deterministic output makes JSON parsing reliable
  });

  let raw = (resp.choices[0].message.content ?? "").trim();

  // Strip accidental markdown fences the model sometimes adds
  raw = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/, "");

  try {
    return JSON.parse(raw);
  } catch {
    // Fall back to extracting whatever array-like content is present
    const match = raw.match(/\[.*\]/s);
    if (match) return JSON.parse(match[0]);
    throw new Error("failed to parse skills from model output: " + raw);
  }
}

// Compares CV text and job description text, returning the skills present in
// the job description that are absent from the CV.
export async function findGaps(
  cvText: string,
  jobText: string
): Promise<{ cvSkills: string[]; jobSkills: string[]; missing: string[] }> {
  const [cvSkills, jobSkills] = await Promise.all([
    extractSkillNames(cvText),
    extractSkillNames(jobText),
  ]);

  // Case-insensitive comparison guards against minor normalisation inconsistencies
  const cvSet = new Set(cvSkills.map(s => s.toLowerCase()));
  const missing = jobSkills.filter(s => !cvSet.has(s.toLowerCase()));

  return { cvSkills, jobSkills, missing };
}

// Takes the list of missing skills and returns structured, actionable advice
// with a learning resource for each skill.
export async function describeGap(missing: string[]): Promise<string> {
  if (missing.length === 0) return "No gaps – the CV covers all required skills!";

  const skillList = missing.map(s => `• ${s}`).join("\n");

  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a career advisor helping Computer Science students prepare for industry placements. " +
          "For each missing skill the student needs to develop, write one short sentence explaining why it matters " +
          "for a placement role, then give the single best learning resource for it (name + URL). " +
          "Use this format for each skill:\n\n" +
          "**<skill name>**: <why it matters>. Learn it here: <Resource Name> – <URL>\n\n" +
          "Be concise and specific. Do not add an introduction or conclusion.",
      },
      {
        role: "user",
        content: `The student is missing the following skills:\n\n${skillList}`,
      },
    ],
    temperature: 0.3,
  });

  return resp.choices[0].message.content ?? "";
}
