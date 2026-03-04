import fs from 'fs';
import { parseCv } from "./cv-parser.service";
import { findGaps, describeGap } from "./gap-analysis.service";
import { supabase } from "../supabase/client";


async function fetchJobDescription(jobId: string): Promise<string> {
  const { data, error } = await supabase
    .from("jobs")
    .select("description")
    .eq("id", jobId)
    .single();

  if (error) throw error;
  return data.description;
}


// Given a path/URL to a resume and the text of a job description, returns the skill gap report.

export async function analyseCvAgainstJob(
  cvLocation: string,      // path on disk or URL
  jobText: string
): Promise<{ cvSkills: string[]; jobSkills: string[]; missing: string[]; advice?: string }> {
  let cvText: string;

  if (cvLocation.startsWith("http")) {
    // download to a buffer then feed into parser
    const res = await fetch(cvLocation);
    const buf = Buffer.from(await res.arrayBuffer());
    // you could tweak extractTextFromFile to accept a Buffer directly
    const tmp = "/tmp/cv.pdf"; // or use stream; here’s the idea
    await fs.promises.writeFile(tmp, buf);
    cvText = await parseCv(tmp);
  } else {
    cvText = await parseCv(cvLocation);
  }

  const { cvSkills, jobSkills, missing } = await findGaps(cvText, jobText);
  const advice = await describeGap(missing);
  return { cvSkills, jobSkills, missing, advice };
}


/*
async function example() {
  const jobId = "123";                 // whatever ID you’ve got
  const cvPath = "/Users/jishnu/resume.pdf";

  const jobText = await fetchJobDescription(jobId);

  const { cvSkills, jobSkills, missing, advice } =
    await analyseCvAgainstJob(cvPath, jobText);

  // `advice` is the polished paragraph returned by the LLM
  const gapAdvice: string | undefined = advice;
  console.log(gapAdvice);
}

example();
*/