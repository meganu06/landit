import { Request, Response } from "express";
import { analyseCvAgainstJob } from "../services/gap-workflow.service";

export async function gapHandler(req: Request, res: Response) {
  const { cvUrl, jobDescription } = req.body;
  const report = await analyseCvAgainstJob(cvUrl, jobDescription);
  res.json(report);
}