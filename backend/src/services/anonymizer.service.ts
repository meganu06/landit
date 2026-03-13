import nlp from "compromise";

function replacePhones(text: string): string {
  return text.replace(
    /\(?\+?\d[\d\s.()\-]{8,}\d/g,
    (match) => {
      const digitCount = match.replace(/\D/g, "").length;
      return digitCount >= 10 ? "<PHONE>" : match;
    }
  );
}

// Anonymizes CV text before it is sent to any LLM.
export function anonymize(text: string): string {
  const preProcessed = text
    .replace(/\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, "<SSN>")
    .replace(/\b[A-Z]{2}\d{6}[A-Z]\b/gi, "<NI_NUMBER>")
    .replace(/https?:\/\/\S+/gi, "<URL>");

  const phonesCleaned = replacePhones(preProcessed);

  const doc = nlp(phonesCleaned);
  doc.match("#Person").replaceWith("<PERSON>");
  doc.match("#Date").replaceWith("<DATE>");
  doc.match("#Place").replaceWith("<PLACE>");
  doc.match("#Email").replaceWith("<EMAIL>");

  return doc.text();
}
