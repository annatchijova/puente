export function parseDraft(raw: string, source: string) {
  const result: unknown = JSON.parse(raw);
  if (!Array.isArray(result) || result.length === 0 || result.length > 8) {
    throw new Error("Expected one to eight draft statements.");
  }

  return result.map((entry: unknown) => {
    if (typeof entry === "object" && entry !== null &&
        "text" in entry && typeof entry.text === "string" && entry.text.trim() &&
        "sourceSpan" in entry && typeof entry.sourceSpan === "string" &&
        entry.sourceSpan.trim()) {
      const start = source.indexOf(entry.sourceSpan);
      if (start >= 0 && start === source.lastIndexOf(entry.sourceSpan)) {
        return { text: entry.text.trim(), sourceSpan: entry.sourceSpan };
      }
    }

    return null;
  });
}
