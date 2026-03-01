import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * TranslationService
 * ------------------
 * Responsible ONLY for translating structured fields.
 *
 * Uses batch translation to:
 * - Reduce API calls
 * - Avoid rate limits
 * - Improve performance
 *
 * Language-agnostic.
 */
export class TranslationService {

  private model;

  constructor() {
    const key = process.env.GEMINI_API_KEY;

    if (!key) {
      throw new Error("GEMINI_API_KEY not set");
    }

    const genAI = new GoogleGenerativeAI(key);

    this.model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });
  }

  /**
   * Detect if text likely needs translation.
   * Avoid unnecessary API calls for already-English text.
   */
  private needsTranslation(text?: string | null): boolean {
    if (!text) return false;

    // If contains non-latin characters → translate
    return /[^\u0000-\u007f]/.test(text);
  }

  /**
   * Batch translate structured transaction fields.
   */
  async translateTransactions(transactions: any[]) {
    if (!transactions.length) return transactions;

    /**
     * 1️⃣ Collect unique values that need translation
     */
    const uniqueValues = new Set<string>();

    for (const tx of transactions) {
      if (this.needsTranslation(tx.nature)) {
        uniqueValues.add(tx.nature);
      }
      if (this.needsTranslation(tx.buyerName)) {
        uniqueValues.add(tx.buyerName);
      }
      if (this.needsTranslation(tx.sellerName)) {
        uniqueValues.add(tx.sellerName);
      }
    }

    if (uniqueValues.size === 0) {
      return transactions; // nothing to translate
    }

    const valuesArray = Array.from(uniqueValues);

    /**
     * 2️⃣ Send single batch prompt
     */
    const prompt = `
You are a professional legal document translator.

Translate the following phrases into English.

Return ONLY valid JSON in this format:

{
  "original_text": "translated_text"
}

Phrases:
${valuesArray.map((v, i) => `${i + 1}. ${v}`).join("\n")}
`;

    const result = await this.model.generateContent(prompt);
    const raw = result.response.text().trim();

    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Invalid translation response");
    }

    const cleanJson = raw.slice(jsonStart, jsonEnd + 1);
    const translationsMap = JSON.parse(cleanJson);

    /**
     * 3️⃣ Map translations back to transactions
     */
    return transactions.map((tx) => ({
      ...tx,
      natureEnglish:
        translationsMap[tx.nature] ?? tx.nature,
      buyerNameEnglish:
        translationsMap[tx.buyerName] ?? tx.buyerName,
      sellerNameEnglish:
        translationsMap[tx.sellerName] ?? tx.sellerName,
    }));
  }
}