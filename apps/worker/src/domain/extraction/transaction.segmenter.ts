export function segmentTransactions(rawText: string): string[] {
  // 🔹 1. Normalize text
  const normalizedText = rawText
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .replace(/\s*\/\s*/g, "/");

  // 🔹 2. Match all doc-like patterns
  const docRegex = /\b\d+\/\d{4}\b/g;
  const rawMatches = [...normalizedText.matchAll(docRegex)];

  // 🔹 3. Contextual filtering
  const matches = rawMatches.filter((match) => {
    const index = match.index!;
    const context = normalizedText.slice(
      Math.max(0, index - 120),
      index + 120
    );

    // Keep only if near a real execution date
    return /\d{2}-[A-Za-z]{3}-\d{4}/.test(context);
  });

  console.log("Filtered doc number matches:", matches.length);

  const blocks: string[] = [];

  // 🔹 4. Segment based on filtered matches
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index!;
    const end =
      i + 1 < matches.length
        ? matches[i + 1].index!
        : normalizedText.length;

    const block = normalizedText.slice(start, end).trim();

    blocks.push(block);
  }

  return blocks;
}