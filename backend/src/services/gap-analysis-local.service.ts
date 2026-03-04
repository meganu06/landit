// Simple offline gap analysis using a static skill list and light NLP. Potentially useful
// but probably too annoying to implement because we need to maintain a skills list.

import nlp from "compromise";

// You should populate `SKILLS` with whatever set of technologies/abilities you
// care about. This example contains a few entries to demonstrate structure.
export const SKILLS = [
  "javascript",
  "typescript",
  "node",
  "react",
  "python",
  "sql",
  "agile",
  "communication",
  "problem solving",
  "csharp",
  "java",
  "aws",
  "docker",
];

// Optional map for normalising variant spellings/abbreviations to a canonical form.
export const NORMALISER: Record<string, string> = {
  programming: "program",
  js: "javascript",
  "c#": "csharp",
  "reactjs": "react",
};

function normaliseToken(tok: string): string {
  tok = tok.toLowerCase().trim();
  if (NORMALISER[tok]) return NORMALISER[tok];
  // use compromise to lemmatise verbs etc.
  const doc = nlp(tok);
  const inf = doc.verbs().toInfinitive().out();
  if (inf) return inf;
  return tok;
}

function tokenize(text: string): string[] {
  // split on word boundaries and also return bigrams to catch multi-word skills
  // force words to be a string[] since match() can return null and `[]` is typed never[]
  const words: string[] = text.toLowerCase().match(/\b[\w#+\.]+\b/g) || [];
  const bigrams = words
    .map((w, i) => (i + 1 < words.length ? w + " " + words[i + 1] : ""))
    // filter out empty strings; use a type guard so TS knows we now have only strings
    .filter((x): x is string => x.length > 0);
  return words.concat(bigrams);
}

export function extractSkillsLocal(text: string): string[] {
  const tokens = tokenize(text).map(normaliseToken);
  const found = new Set<string>();

  for (const tok of tokens) {
    if (SKILLS.includes(tok)) {
      found.add(tok);
    }
  }

  return Array.from(found);
}

export function findGapsLocal(
  cvText: string,
  jobText: string
): { cvSkills: string[]; jobSkills: string[]; missing: string[] } {
  const cvSkills = extractSkillsLocal(cvText);
  const jobSkills = extractSkillsLocal(jobText);

  const cvSet = new Set(cvSkills);
  const missing = jobSkills.filter((s) => !cvSet.has(s));

  return { cvSkills, jobSkills, missing };
}
