import { ExtractedTransaction } from "./transaction.types.js";

/**
 * -------------------------------------------------------
 * Normalize Tamil Text
 * -------------------------------------------------------
 * Fixes:
 * - Broken spacing between Tamil letters
 * - Double dots ".."
 * - Trailing hyphen
 * - Multiple spaces
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
 *
 * Strategy:
 * 1. Use original stable line-based regex.
 * 2. If only one match but contains multiple numbers,
 *    split manually (edge case fix).
 *
 * This avoids breaking earlier working transactions.
 */
function extractBuyerSeller(block: string) {

  /**
   * 🔹 Original stable logic:
   * Match lines like:
   * 1. Name
   * 2. Name
   */
  const lineMatches =
    block.match(/\d+\.\s+[^\n]+/g) || [];

  let matches = lineMatches;

  /**
   * 🔥 Edge Case:
   * If only one line matched but contains multiple numbered names
   * Example:
   * 1. A   1. B
   */
  if (
    lineMatches.length === 1 &&
    (lineMatches[0].match(/\d+\./g)?.length ?? 0) > 1
  ) {
    matches =
      lineMatches[0].match(/\d+\.\s+[^0-9]+/g) || [];
  }

  if (matches.length === 0) {
    return {
      sellerName: null,
      buyerName: null,
    };
  }

  /**
   * Clean extracted names
   */
  const cleaned = matches
    .map(line =>
      normalizeTamil(
        line.replace(/^\d+\.\s+/, "")
      )
    )
    .filter(Boolean);

  /**
   * If only one party found → treat as seller
   */
  if (cleaned.length === 1) {
    return {
      sellerName: cleaned[0],
      buyerName: null,
    };
  }

  /**
   * Split evenly:
   * First half → sellers
   * Second half → buyers
   */
  const midpoint = Math.ceil(cleaned.length / 2);

  return {
    sellerName: cleaned.slice(0, midpoint).join(", "),
    buyerName: cleaned.slice(midpoint).join(", "),
  };
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

  const natureMatch =
    block.match(/Conveyance/i);

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