/** Display label for custom / open-ended questionnaire options. */
export const QUESTIONNAIRE_OTHERS_LABEL = "Others";

export function isQuestionnaireOthersOptionLabel(label: string): boolean {
  const n = (label ?? "").trim().toLowerCase();
  return (
    /custom\s*quote/.test(n) ||
    /\bother(s)?\b/.test(n) ||
    /more property/.test(n) ||
    /not listed/.test(n) ||
    /100\+/.test(n) ||
    /more than \d+/.test(n) ||
    /7\+|8\+|11\+|16\+|26\+|51\+|3\+/.test(n)
  );
}

/** Use "Others" for custom-quote and catch-all options; keep normal labels unchanged. */
export function formatQuestionnaireOptionLabel(label: string): string {
  const trimmed = (label ?? "").trim();
  if (!trimmed) return QUESTIONNAIRE_OTHERS_LABEL;
  return isQuestionnaireOthersOptionLabel(trimmed) ? QUESTIONNAIRE_OTHERS_LABEL : trimmed;
}

export function isOtherPropertyTypeName(name: string): boolean {
  const n = (name ?? "").trim().toLowerCase();
  return (
    n === "other" ||
    n === "others" ||
    n.includes("more property") ||
    (n.includes("other") && n.includes("property")) ||
    n.includes("not listed") ||
    (n.includes("custom") && n.includes("property"))
  );
}
