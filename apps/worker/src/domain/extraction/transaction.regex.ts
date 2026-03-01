import { ExtractedTransaction } from "./transaction.types.js";

export function extractTransaction(block: string): ExtractedTransaction {
  const docNoMatch = block.match(/\d+\/\d{4}/);

  const dateMatches = block.match(/\d{2}-[A-Za-z]{3}-\d{4}/g);

  const natureMatch = block.match(/Conveyance/i);

  const rupeeMatches = [
    ...block.matchAll(/ரூ\s*\.\s*([\d,]+)/g)
  ];

  const surveyMatch = block.match(
    /Survey\s*No[^:]*:\s*([^\n]+)/i
  );

  const plotMatch = block.match(
    /Plot\s*No[^:]*:\s*([^\n]+)/i
  );

  const extentMatch = block.match(
    /Property\s*Extent[^:]*:\s*([\d.]+)/i
  );

  return {
    docNo: docNoMatch?.[0] ?? null,
    executionDate: dateMatches?.[0] ?? null,
    registrationDate: dateMatches?.[1] ?? null,
    nature: natureMatch ? "Conveyance" : null,
    considerationValue: rupeeMatches[0]
      ? rupeeMatches[0][1].replace(/,/g, "")
      : null,
    marketValue: rupeeMatches[1]
      ? rupeeMatches[1][1].replace(/,/g, "")
      : null,
    surveyNumbers: surveyMatch
      ? Array.from(
          new Set(
            surveyMatch[1]
              .split(",")
              .map(s => s.trim())
              .filter(s => /^\d+(\/\d+)?$/.test(s))
          )
        )
      : [],
    plotNumber: plotMatch
      ? plotMatch[1].match(/\d+/)?.[0] ?? null
      : null,
    extent: extentMatch?.[1] ?? null,
  };
}