import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

/**
 * PdfReader
 * ----------
 * Extracts text from PDF buffer while preserving layout structure.
 */
export class PdfReader {
  async extractTextFromBuffer(buffer: Buffer): Promise<string> {
    const data = new Uint8Array(buffer);

    const loadingTask = pdfjs.getDocument({
      data,
      standardFontDataUrl: undefined, // avoids warning
    });

    const pdf = await loadingTask.promise;

    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      const lines: Record<number, string[]> = {};

      for (const item of content.items as any[]) {
        const y = Math.round(item.transform[5]);

        if (!lines[y]) {
          lines[y] = [];
        }

        lines[y].push(item.str);
      }

      const sortedLines = Object.keys(lines)
        .map(Number)
        .sort((a, b) => b - a); // top-to-bottom

      for (const y of sortedLines) {
        fullText += lines[y].join(" ") + "\n";
      }
    }

    return fullText;
  }
}