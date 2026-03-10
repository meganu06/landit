import nlp from "compromise";

// Anonymizes CV text before it is sent to any LLM.
// Regex replacements run first so numeric patterns (e.g. SSNs) are not
// mis-tagged as dates by the NLP tagger.
export function anonymize(text: string): string {
  const preProcessed = text
    .replace(/\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, "<SSN>")
    .replace(/\b\d{10,}\b/g, "<PHONE>")
    .replace(/https?:\/\/\S+/gi, "<URL>");

  const doc = nlp(preProcessed);
  doc.match("#Person").replaceWith("<PERSON>");
  doc.match("#Date").replaceWith("<DATE>");
  doc.match("#Place").replaceWith("<PLACE>");
  doc.match("#Email").replaceWith("<EMAIL>");

  return doc.text();
}
