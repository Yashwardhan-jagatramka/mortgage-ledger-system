import { GoogleGenerativeAI } from "@google/generative-ai";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class GeminiExtractor {
  private model;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not set");
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    this.model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });
  }

  private chunkText(text: string, size = 3000): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += size) {
      chunks.push(text.slice(i, i + size));
    }
    return chunks;
  }

  private sanitizeJsonArray(text: string): any[] {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start === -1 || end === -1) return [];
    return JSON.parse(text.slice(start, end + 1));
  }

  private sanitizeJsonObject(text: string): any | null {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(text.slice(start, end + 1));
  }

  async extractFullDocument(rawText: string): Promise<any[]> {
    const chunks = this.chunkText(rawText, 3000);
    const allTransactions: any[] = [];

    for (let i = 0; i < chunks.length; i++) {
      let retryDelay = 2000;
      let attempts = 0;

      const prompt = `
You are a strict JSON extraction engine.

Extract ALL property transactions from this text chunk.

Return strictly valid JSON array:
[
  {
    "docNo": "",
    "executionDate": "",
    "registrationDate": "",
    "nature": "",
    "considerationValue": "",
    "marketValue": "",
    "surveyNumbers": [],
    "plotNumber": "",
    "extent": ""
  }
]

If none exist, return [].

Return ONLY JSON.

TEXT:
${chunks[i]}
`;

      while (attempts < 3) {
        try {
          const result = await this.model.generateContent(prompt);
          const text = result.response.text().trim();
          const parsed = this.sanitizeJsonArray(text);

          allTransactions.push(...parsed);
          break;
        } catch (err: any) {
          attempts++;

          if (
            err.message?.includes("429") ||
            err.message?.toLowerCase().includes("quota") ||
            err.message?.toLowerCase().includes("rate")
          ) {
            if (attempts >= 3) {
              throw new Error("AI_RATE_LIMIT");
            }
            await sleep(retryDelay);
            retryDelay *= 2;
            continue;
          }

          break;
        }
      }
    }

    return allTransactions;
  }

  async extractSingleBlock(block: string): Promise<any | null> {
    const prompt = `
You are a strict JSON extraction engine.

Extract ONE transaction from this text block.

Return strictly valid JSON object:
{
  "docNo": "",
  "executionDate": "",
  "registrationDate": "",
  "nature": "",
  "considerationValue": "",
  "marketValue": "",
  "surveyNumbers": [],
  "plotNumber": "",
  "extent": ""
}

If extraction not possible, return null.

Return ONLY JSON.

TEXT:
${block}
`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text().trim();
      return this.sanitizeJsonObject(text);
    } catch (err: any) {
      if (
        err.message?.includes("429") ||
        err.message?.toLowerCase().includes("quota") ||
        err.message?.toLowerCase().includes("rate")
      ) {
        throw new Error("AI_RATE_LIMIT");
      }

      return null;
    }
  }
}