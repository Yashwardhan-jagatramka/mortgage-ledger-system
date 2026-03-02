import { ExtractedTransaction } from "./transaction.types.js";

/**
 * -------------------------------------------------------
 * Normalize Tamil Text
 * -------------------------------------------------------
 */
function normalizeTamil(text: string): string {
  return text
    .replace(/([அ-ஹ])\s+(?=[அ-ஹ])/g, "$1")
    .replace(/\.\s*\./g, ".")
    .replace(/-$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * -------------------------------------------------------
 * Extract Buyer & Seller Names
 * -------------------------------------------------------
 */
function extractBuyerSeller(block: string) {
  const lineMatches =
    block.match(/\d+\.\s+[^\n]+/g) || [];

  let matches = lineMatches;

  if (
    lineMatches.length === 1 &&
    (lineMatches[0].match(/\d+\./g)?.length ?? 0) > 1
  ) {
    matches =
      lineMatches[0].match(/\d+\.\s+[^0-9]+/g) || [];
  }

  if (matches.length === 0) {
    return { sellerName: null, buyerName: null };
  }

  const cleaned = matches
    .map(line =>
      normalizeTamil(
        line.replace(/^\d+\.\s+/, "")
      )
    )
    .filter(Boolean);

  if (cleaned.length === 1) {
    return {
      sellerName: cleaned[0],
      buyerName: null,
    };
  }

  const midpoint = Math.ceil(cleaned.length / 2);

  return {
    sellerName: cleaned.slice(0, midpoint).join(", "),
    buyerName: cleaned.slice(midpoint).join(", "),
  };
}

/**
 * -------------------------------------------------------
 * Extract Nature Structurally
 * -------------------------------------------------------
 * Capture anything between registration date and
 * "Consideration Value"
 */
function extractNature(block: string): string | null {
  const lines = block
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  // Look for known nature-like keywords
  const natureKeywords = [
    "Conveyance",
    "Power of Attorney",
    "Deposit of Title Deeds",
    "Mortgage",
    "Settlement",
    "Gift",
    "Sale",
    "Metro/UA"
  ];

  for (const line of lines) {
    if (
      natureKeywords.some(keyword =>
        line.toLowerCase().includes(keyword.toLowerCase())
      )
    ) {
      return line.length <= 100
        ? line
        : line.slice(0, 100);
    }
  }

  return null;
}

/**
 * -------------------------------------------------------
 * Main Extraction Function
 * -------------------------------------------------------
 */
export function extractTransaction(
  block: string
): ExtractedTransaction {

  const docNoMatch =
    block.match(/\d+\/\d{4}/);

  const dateMatches =
    block.match(/\d{2}-[A-Za-z]{3}-\d{4}/g);

  const rupeeMatches = [
    ...block.matchAll(/ரூ\s*\.\s*([\d,]+)/g),
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

  const { sellerName, buyerName } =
    extractBuyerSeller(block);

  return {
    docNo: docNoMatch?.[0] ?? null,
    executionDate: dateMatches?.[0] ?? null,
    registrationDate: dateMatches?.[1] ?? null,

    // 🔥 New structural nature extraction
    nature: extractNature(block),

    considerationValue: rupeeMatches[0]
      ? rupeeMatches[0][1].replace(/,/g, "")
      : null,

    // More tolerant market value extraction
    marketValue:
      rupeeMatches[1]
        ? rupeeMatches[1][1].replace(/,/g, "")
        : rupeeMatches[0]
        ? rupeeMatches[0][1].replace(/,/g, "")
        : null,

    surveyNumbers: surveyMatch
      ? Array.from(
          new Set(
            surveyMatch[1]
              .split(",")
              .map(s => s.trim())
              .filter(s =>
                /^\d+(\/\d+)?$/.test(s)
              )
          )
        )
      : [],

    plotNumber: plotMatch
      ? plotMatch[1].match(/\d+/)?.[0] ?? null
      : null,

    extent: extentMatch?.[1] ?? null,

    sellerName,
    buyerName,
  };
}