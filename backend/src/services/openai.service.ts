import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ExtractedSkillsResult {
  skills: string[];
  soft_skills: string[];
  experience_years: number;
}

/**
 * Extracts technical skills, soft skills, and years of experience
 * from raw CV text using the OpenAI API.
 *
 * @param cvText - Raw text string from cv-parser.service.ts
 * @returns Structured JSON with skills and experience (FR5)
 */
export async function extractSkillsFromCV(
  cvText: string
): Promise<ExtractedSkillsResult> {
  if (!cvText || cvText.trim().length === 0) {
    throw new Error('CV text is empty or invalid.');
  }

  const prompt = `You are a CV analysis assistant. Extract structured information from the following CV text.
Return ONLY a valid JSON object with no extra text, no markdown, no code blocks.

The JSON must follow this exact structure:
{
  "skills": ["list of technical skills, tools, languages, frameworks"],
  "soft_skills": ["list of soft skills like communication, leadership, teamwork"],
  "experience_years": <total years of professional experience as a number, 0 if unclear>
}

CV Text:
${cvText}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are a precise CV parser. You always respond with valid JSON only. Never include markdown formatting or extra explanation.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.1, // Low temperature for consistent, deterministic output
    max_tokens: 1000,
  });

  const raw = response.choices[0]?.message?.content;

  if (!raw) {
    throw new Error('OpenAI returned an empty response.');
  }

  let parsed: ExtractedSkillsResult;
  try {
    parsed = JSON.parse(raw) as ExtractedSkillsResult;
  } catch {
    throw new Error(
      `Failed to parse OpenAI response as JSON. Raw response: ${raw}`
    );
  }

  // Validate shape of response
  if (!Array.isArray(parsed.skills) || !Array.isArray(parsed.soft_skills)) {
    throw new Error(
      'OpenAI response is missing required fields: skills or soft_skills.'
    );
  }

  if (typeof parsed.experience_years !== 'number') {
    parsed.experience_years = 0;
  }

  return parsed;
}
