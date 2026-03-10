import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
