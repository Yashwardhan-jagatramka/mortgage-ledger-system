import { v2 } from "@google-cloud/translate";
import { redis } from "../../infrastructure/redis.client.js";
import { logger } from "../../infrastructure/logger.js";

/**
 * TranslationService
 * ------------------
 * Production-grade translation layer using Google Cloud Translate (v2).
 *
 * Responsibilities:
 * - Translate ONLY buyerName & sellerName
 * - Batch translation
 * - Redis caching per name
 * - Avoid duplicate API calls
 * - Fail safely (never break document processing)
 */

export class TranslationService {
  private translate: v2.Translate;

  constructor() {
    const key = process.env.GOOGLE_TRANSLATE_API_KEY;

    if (!key) {
      throw new Error("GOOGLE_TRANSLATE_API_KEY not set");
    }

    // ✅ Correct initialization for @google-cloud/translate v9+
    this.translate = new v2.Translate({
      key,
    });
  }

  /**
   * Detect if text contains non-ASCII (Tamil etc.)
   * Avoid unnecessary API calls.
   */
  private needsTranslation(text?: string | null): boolean {
    if (!text) return false;
    return /[^\u0000-\u007f]/.test(text);
  }

  /**
   * Redis cache key for individual name translation
   */
  private cacheKey(text: string) {
    return `translate:${text}`;
  }

  /**
   * Main entry point
   */
  async translateTransactions(transactions: any[]) {
    if (!transactions.length) return transactions;

    /**
     * 1️⃣ Collect unique Tamil names (buyer + seller only)
     */
    const uniqueNames = new Set<string>();

    for (const tx of transactions) {
      if (this.needsTranslation(tx.buyerName)) {
        uniqueNames.add(tx.buyerName);
      }

      if (this.needsTranslation(tx.sellerName)) {
        uniqueNames.add(tx.sellerName);
      }
    }

    if (uniqueNames.size === 0) {
      return transactions;
    }

    const namesArray = Array.from(uniqueNames);

    /**
     * 2️⃣ Check Redis cache first
     */
    const translationsMap: Record<string, string> = {};
    const namesToTranslate: string[] = [];

    for (const name of namesArray) {
      const cached = await redis.get(this.cacheKey(name));

      if (cached) {
        translationsMap[name] = cached;
      } else {
        namesToTranslate.push(name);
      }
    }

    /**
     * 3️⃣ Batch call Google in chunks (avoid API limits)
     */
    if (namesToTranslate.length > 0) {
      try {
        const CHUNK_SIZE = 50;
        const chunks: string[][] = [];

        for (let i = 0; i < namesToTranslate.length; i += CHUNK_SIZE) {
          chunks.push(namesToTranslate.slice(i, i + CHUNK_SIZE));
        }

        for (const chunk of chunks) {
          const [translations] = await this.translate.translate(chunk, "en");

          const translatedArray = Array.isArray(translations)
            ? translations
            : [translations];

          chunk.forEach((original, index) => {
            const translated = translatedArray[index];

            translationsMap[original] = translated;

            redis.set(
              this.cacheKey(original),
              translated,
              "EX",
              86400
            );
          });
        }

        logger.info(
          {
            totalRequested: namesToTranslate.length,
            chunkCount: chunks.length,
          },
          "Chunked translation completed"
        );
      } catch (err: any) {
        logger.warn(
          { error: err?.message },
          "Google translation failed — skipping English enrichment"
        );

        return transactions;
      }
    }

    /**
     * 4️⃣ Map translations back
     */
    return transactions.map((tx) => ({
      ...tx,
      buyerNameEnglish:
        translationsMap[tx.buyerName] ?? tx.buyerName ?? null,
      sellerNameEnglish:
        translationsMap[tx.sellerName] ?? tx.sellerName ?? null,
    }));
  }
}