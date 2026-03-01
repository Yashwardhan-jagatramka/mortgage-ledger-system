export function segmentTransactions(rawText: string): string[] {
  const docRegex =
    /\d+\s*\/\s*\d{4}(?=\s+\d{2}-[A-Za-z]{3}-\d{4})/g;

  const matches = [...rawText.matchAll(docRegex)];
  const blocks: string[] = [];

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index!;
    const end =
      i + 1 < matches.length
        ? matches[i + 1].index!
        : rawText.length;

    const block = rawText
      .slice(start, end)
      .replace(/\s*\/\s*/g, "/")
      .trim();

    blocks.push(block);
  }

  return blocks;
  
}