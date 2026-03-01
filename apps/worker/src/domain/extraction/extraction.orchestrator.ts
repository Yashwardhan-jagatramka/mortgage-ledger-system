import { segmentTransactions } from "./transaction.segmenter.js";
import { extractTransaction } from "./transaction.regex.js";
import { GeminiExtractor } from "./gemini.extractor.js";
import { ExtractedTransaction } from "./transaction.types.js";

function isValidTransaction(tx: any): boolean {
  return (
    !!tx.docNo &&
    !!tx.executionDate &&
    !!tx.registrationDate &&
    !!tx.nature &&
    !!tx.considerationValue &&
    !!tx.marketValue
  );
}

function detectExpectedCount(rawText: string): number {
  const matches = [
    ...rawText.matchAll(/(\d{1,3})\s*\n\s*Conveyance/gi),
  ].map((m) => parseInt(m[1]));

  return matches.length ? Math.max(...matches) : 0;
}

export class ExtractionOrchestrator {
  private gemini = new GeminiExtractor();
  private FULL_AI_THRESHOLD = 0.70;

  async extract(rawText: string) {
    const blocks = segmentTransactions(rawText);
    const expectedCount = detectExpectedCount(rawText);

    const segmentationConfidence =
      expectedCount > 0 ? blocks.length / expectedCount : 0;

    // 🔥 FULL DOCUMENT AI (only if segmentation is really bad)
    if (segmentationConfidence < this.FULL_AI_THRESHOLD) {
      try {
        const aiFull = await this.gemini.extractFullDocument(rawText);

        const confidence =
          expectedCount > 0
            ? aiFull.length / expectedCount
            : 0;

        return {
          transactions: aiFull,
          expectedCount,
          confidence,
          aiUsed: true,
          regexCount: 0,
          aiRecovered: aiFull.length,
          mode: "FULL_AI",
        };
      } catch (err: any) {
        if (err.message === "AI_RATE_LIMIT") {
          return {
            transactions: [],
            expectedCount,
            confidence: 0,
            aiUsed: false,
            regexCount: 0,
            aiRecovered: 0,
            mode: "MANUAL_REQUIRED",
            message:
              "AI fallback unavailable due to provider rate limits. Manual review required.",
          };
        }
        throw err;
      }
    }

    // 🔥 REGEX FIRST
    const regexSuccess: ExtractedTransaction[] = [];
    const regexFailedBlocks: string[] = [];

    for (const block of blocks) {
      const tx = extractTransaction(block);

      if (isValidTransaction(tx)) {
        regexSuccess.push(tx);
      } else {
        regexFailedBlocks.push(block);
      }
    }

    const recovered: ExtractedTransaction[] = [];

    for (const failedBlock of regexFailedBlocks) {
      try {
        const aiResult =
          await this.gemini.extractSingleBlock(failedBlock);
        if (aiResult) recovered.push(aiResult);
      } catch (err: any) {
        if (err.message === "AI_RATE_LIMIT") {
          break;
        }
      }
    }

    const finalTransactions = [...regexSuccess, ...recovered];

    const confidence =
      expectedCount > 0
        ? finalTransactions.length / expectedCount
        : 0;

    return {
      transactions: finalTransactions,
      expectedCount,
      confidence,
      aiUsed: recovered.length > 0,
      regexCount: regexSuccess.length,
      aiRecovered: recovered.length,
      mode:
        recovered.length > 0
          ? "PARTIAL_AI"
          : "REGEX_ONLY",
    };
  }
}