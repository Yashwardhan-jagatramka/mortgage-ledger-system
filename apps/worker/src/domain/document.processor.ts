import { extractKeyFromUrl } from "../utils/s3.utils.js";
import { downloadFile, BUCKET_NAME } from "../infrastructure/s3.client.js";
import { DocumentRepository } from "../repositories/document.repository.js";
import { logger } from "../infrastructure/logger.js";
import { redis } from "../infrastructure/redis.client.js";

import { ExtractionOrchestrator } from "./extraction/extraction.orchestrator.js";
import { PdfReader } from "./pdf/pdf.reader.js";
import { TranslationService } from "./translation/translation.service.js";

import { db, documents, transactions, eq } from "@mortgage/db";

/**
 * DocumentProcessor
 * -----------------
 * Responsible for:
 * - Downloading PDF
 * - Extracting text
 * - Running extraction pipeline
 * - Translating structured fields (batch)
 * - Storing results
 * - Updating document status
 * - Warming Redis cache
 */
export class DocumentProcessor {
  private repo = new DocumentRepository();
  private translator = new TranslationService();

  /**
   * Default cache key for full transaction fetch (no filters)
   */
  private baseCacheKey(documentId: string) {
    return `document:${documentId}:transactions:ALL`;
  }

  /**
   * Normalize Tamil OCR spacing artifacts
   * Example:
   * "வி .. அ ரு ணகி ரி"
   * becomes
   * "வி அருணகிரி"
   */
  private normalizeTamil(text?: string | null) {
    if (!text) return null;

    return text
      .replace(/\s+/g, " ")
      .replace(/\s?\.\.\s?/g, " ")
      .trim();
  }

  async process(documentId: string) {
    logger.info({ documentId }, "Processing document");

    await this.repo.updateStatus(documentId, "PROCESSING");
    await this.repo.updateProgress(documentId, 10);

    try {
      /**
       * 🔹 1. Fetch document metadata
       */
      const document = await this.repo.getById(documentId);

      if (!document?.fileUrl) {
        throw new Error("Document fileUrl not found");
      }

      /**
       * 🔹 2. Download PDF from MinIO
       */
      const key = extractKeyFromUrl(document.fileUrl);
      const buffer = await downloadFile(BUCKET_NAME, key);

      /**
       * 🔹 3. Extract text from PDF
       */
      const pdfReader = new PdfReader();
      const rawText = await pdfReader.extractTextFromBuffer(buffer);

      await this.repo.updateProgress(documentId, 40);

      /**
       * 🔹 4. Run Extraction Orchestrator
       */
      const orchestrator = new ExtractionOrchestrator();
      const result = await orchestrator.extract(rawText);

      const extractedTransactions = result.transactions;
      const confidence = result.confidence;

      logger.info(
        {
          expectedCount: result.expectedCount,
          totalExtracted: extractedTransactions.length,
          confidence,
          regexCount: result.regexCount,
          aiRecovered: result.aiRecovered,
          mode: result.mode,
        },
        "Hybrid extraction result"
      );

      await this.repo.updateProgress(documentId, 60);

      /**
       * 🔥 5. Normalize Tamil fields before translation
       */
      for (const t of extractedTransactions) {
        t.buyerName = this.normalizeTamil(t.buyerName);
        t.sellerName = this.normalizeTamil(t.sellerName);
        t.nature = this.normalizeTamil(t.nature);
      }

      /**
       * 🔥 6. Batch Translation (Single Gemini Call)
       * Safe fallback if translation fails
       */
      let enrichedTransactions = extractedTransactions;

      try {
        enrichedTransactions =
          await this.translator.translateTransactions(
            extractedTransactions
          );
      } catch (err) {
        logger.warn(
          { documentId },
          "Translation failed — continuing without English fields"
        );
      }

      await this.repo.updateProgress(documentId, 75);

      /**
       * 🔹 7. Store transactions in DB (Atomic)
       */
      await db.transaction(async (txDb) => {
        await txDb
          .delete(transactions)
          .where(eq(transactions.documentId, documentId));

        for (const t of enrichedTransactions) {
          await txDb.insert(transactions).values({
            documentId,
            docNo: t.docNo ?? null,
            executionDate: t.executionDate ?? null,
            registrationDate: t.registrationDate ?? null,
            nature: t.nature ?? null,
            considerationValue: t.considerationValue ?? null,
            marketValue: t.marketValue ?? null,
            surveyNumbers: t.surveyNumbers ?? [],
            plotNumber: t.plotNumber ?? null,
            extent: t.extent ?? null,
            buyerName: t.buyerName ?? null,
            sellerName: t.sellerName ?? null,
            natureEnglish: t.natureEnglish ?? null,
            buyerNameEnglish: t.buyerNameEnglish ?? null,
            sellerNameEnglish: t.sellerNameEnglish ?? null,
          });
        }

        await txDb
          .update(documents)
          .set({
            confidence: Math.round(confidence * 100),
            progress: 100,
          })
          .where(eq(documents.id, documentId));
      });

      /**
       * 🔥 8. Cache Warming (Performance Boost)
       */
      const cacheKey = this.baseCacheKey(documentId);

      await redis.set(
        cacheKey,
        JSON.stringify(enrichedTransactions),
        "EX",
        21600 // 6 hours
      );

      /**
       * 🔹 9. Status Handling
       */
      if (confidence >= 0.95) {
        await this.repo.updateStatus(documentId, "COMPLETED");
      } else if (enrichedTransactions.length > 0) {
        await this.repo.updateStatus(documentId, "MANUAL_REQUIRED");
      } else {
        await this.repo.markFailed(
          documentId,
          "No transactions extracted"
        );
      }

      logger.info({ documentId }, "Document processing finished");
    } catch (error: any) {
      logger.error(
        {
          documentId,
          message: error?.message,
          stack: error?.stack,
        },
        "Processing failed"
      );

      await this.repo.markFailed(
        documentId,
        error?.message ?? "Unknown error"
      );
    }
  }
}