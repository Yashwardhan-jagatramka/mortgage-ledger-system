import { v4 as uuidv4 } from "uuid";
import { DocumentRepository } from "../repositories/document.repository.js";
import { redis, STREAM_KEY } from "../infrastructure/redis.client.js";
import crypto from "crypto";

/**
 * DocumentService
 * ---------------
 * Business Layer for document operations.
 *
 * Responsibilities:
 * - Validate business rules
 * - Enforce user scoping (multi-tenant safety)
 * - Coordinate repository + Redis
 * - Manage caching strategy
 *
 * DOES NOT:
 * - Handle HTTP (Express layer does that)
 * - Write raw SQL (repository handles that)
 * - Perform heavy extraction logic (worker handles that)
 */

/**
 * Generates deterministic cache key based on:
 * - documentId
 * - filters object
 *
 * We hash filters to:
 * - Avoid long Redis keys
 * - Ensure stable cache keys
 * - Keep filter order irrelevant
 */
function generateCacheKey(documentId: string, filters: any) {
  const hash = crypto
    .createHash("md5")
    .update(JSON.stringify(filters ?? {}))
    .digest("hex");

  return `document:${documentId}:transactions:${hash}`;
}

/**
 * Pattern used for invalidating all cache entries
 * related to a specific document.
 */
function baseCachePattern(documentId: string) {
  return `document:${documentId}:transactions:*`;
}

export class DocumentService {
  private repo = new DocumentRepository();

  /**
   * Create a new document record.
   *
   * Flow:
   * 1️⃣ Insert DB record (status: PENDING)
   * 2️⃣ Push async job to Redis Stream
   *
   * Worker will later:
   * - Download PDF
   * - Extract transactions
   * - Update document status
   */
  async createDocument(
    userId: string,
    fileName: string,
    fileUrl: string
  ) {
    const id = uuidv4();

    await this.repo.create({
      id,
      userId,
      fileName,
      fileUrl,
      status: "PENDING",
      confidence: 0,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Push job to Redis stream for async processing
    await redis.xadd(STREAM_KEY, "*", "documentId", id);

    return { id, status: "PENDING" };
  }

  /**
   * Delete a document (User Scoped)
   *
   * Business Rules:
   * - Must belong to user
   * - Remove document
   * - Invalidate Redis cache
   */
  async deleteDocument(
    documentId: string,
    userId: string
  ) {
    const doc = await this.repo.getById(
      documentId,
      userId
    );

    if (!doc) {
      throw new Error("Document not found");
    }

    // Delete DB record
    await this.repo.delete(documentId);

    // Invalidate Redis cache
    await this.invalidateTransactionCache(
      documentId
    );
  }

  /**
   * Get document metadata.
   *
   * Enforces user ownership at repository level.
   */
  async getDocument(id: string, userId: string) {
    const doc = await this.repo.getById(id, userId);

    if (!doc) {
      throw new Error("Document not found");
    }

    return doc;
  }

  /**
   * Get transactions for a document with optional filters.
   *
   * Strategy:
   * 1️⃣ Check Redis cache first (fast path)
   * 2️⃣ Validate document ownership
   * 3️⃣ Query DB if cache miss
   * 4️⃣ Store result in Redis (6 hour TTL)
   *
   * This ensures:
   * - Fast repeated queries
   * - Strong multi-tenant security
   */
  async getTransactions(
    documentId: string,
    userId: string,
    filters: any
  ) {
    const cacheKey = generateCacheKey(documentId, filters);

    /**
     * 🔥 Step 1 — Try Redis cache
     */
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    /**
     * 🔐 Step 2 — Validate document ownership
     */
    const doc = await this.repo.getById(documentId, userId);
    if (!doc) {
      throw new Error("Document not found");
    }

    /**
     * 🗄 Step 3 — Query database
     */
    const transactions =
      await this.repo.findTransactions(documentId, filters);

    /**
     * 🚀 Step 4 — Cache result (6 hours)
     */
    await redis.set(
      cacheKey,
      JSON.stringify(transactions),
      "EX",
      21600
    );

    return transactions;
  }

  /**
   * Invalidate all Redis cache entries for a document.
   *
   * Uses SCAN instead of KEYS to avoid blocking Redis.
   *
   * Triggered after:
   * - Manual override
   * - Future document edits
   */
  private async invalidateTransactionCache(documentId: string) {
    const pattern = baseCachePattern(documentId);

    let cursor = "0";

    do {
      const result = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100
      );

      cursor = result[0];
      const keys = result[1];

      if (keys.length > 0) {
        await redis.del(...keys);
      }

    } while (cursor !== "0");
  }

  /**
   * Manual Override
   *
   * Allows user to:
   * - Correct extracted data
   * - Add missing transactions
   * - Finalize document
   *
   * Business Rules:
   * - Document must exist
   * - Must belong to user
   * - Must be in MANUAL_REQUIRED or FAILED state
   * - Transactions cannot be empty
   *
   * After successful override:
   * - DB is updated atomically
   * - Cache is invalidated
   */
  async manualOverride(
    documentId: string,
    userId: string,
    transactions: any[]
  ) {
    const doc = await this.repo.getById(
      documentId,
      userId
    );

    if (!doc) {
      throw new Error("Document not found");
    }

    // 🔥 Only block if still running
    if (
      doc.status === "PENDING" ||
      doc.status === "PROCESSING"
    ) {
      throw new Error(
        "Cannot override while document is processing"
      );
    }

    if (!transactions || transactions.length === 0) {
      throw new Error("Transactions cannot be empty");
    }

    await this.repo.replaceTransactions(
      documentId,
      transactions
    );

    /**
     * 🔥 Invalidate Redis cache
     */
    await this.invalidateTransactionCache(documentId);

    return {
      message: "Manual override completed successfully",
      documentId,
    };
  }

  /**
  * List all documents for a user.
  *
  * Returns metadata only.
  */
  async listUserDocuments(userId: string) {
    return this.repo.findByUserId(userId);
  }
}