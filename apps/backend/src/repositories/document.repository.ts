import { db, documents, transactions, eq, and, ilike, sql } from "@mortgage/db";

/**
 * DocumentRepository
 * ------------------
 * Responsible ONLY for database interactions.
 * - No business rules
 * - No validation logic
 * - No HTTP awareness
 */
export class DocumentRepository {

  /**
   * Fetch document by ID
   */
  async getById(id: string, userId: string) {
  return db.query.documents.findFirst({
    where: (documents, { eq, and }) =>
      and(
        eq(documents.id, id),
        eq(documents.userId, userId)
      ),
  });
}

  /**
   * Create a new document record
   */
  async create(data: typeof documents.$inferInsert) {
    return db.insert(documents).values(data);
  }

  /**
   * Fetch transactions with DB-level filtering.
   *
   * Filtering is done in SQL for performance.
   */
  async findTransactions(
  documentId: string,
  filters: {
    docNo?: string;
    buyerName?: string;
    sellerName?: string;
    surveyNumber?: string;
    plotNumber?: string;
  }
) {
  const conditions = [
    eq(transactions.documentId, documentId),
  ];

  // Exact document number
  if (filters.docNo) {
    conditions.push(eq(transactions.docNo, filters.docNo));
  }

  // Buyer filtering (original + translated)
  if (filters.buyerName) {
    conditions.push(
      sql`(
        ${transactions.buyerName} ILIKE ${`%${filters.buyerName}%`}
        OR
        ${transactions.buyerNameEnglish} ILIKE ${`%${filters.buyerName}%`}
      )`
    );
  }

  // Seller filtering
  if (filters.sellerName) {
    conditions.push(
      sql`(
        ${transactions.sellerName} ILIKE ${`%${filters.sellerName}%`}
        OR
        ${transactions.sellerNameEnglish} ILIKE ${`%${filters.sellerName}%`}
      )`
    );
  }

  // Survey number (search inside JSON text)
  if (filters.surveyNumber) {
    conditions.push(
      sql`${transactions.surveyNumbers}::text ILIKE ${`%${filters.surveyNumber}%`}`
    );
  }

  // Plot number
  if (filters.plotNumber) {
    conditions.push(
      sql`${transactions.plotNumber} ILIKE ${`%${filters.plotNumber}%`}`
    );
  }

  return db
    .select()
    .from(transactions)
    .where(and(...conditions));
}

  /**
   * Replace all transactions for a document.
   *
   * Used by Manual Override flow.
   * Executed atomically.
   */
  async replaceTransactions(
    documentId: string,
    newTransactions: any[]
  ) {
    await db.transaction(async (tx) => {

      // 1️⃣ Delete old transactions
      await tx
        .delete(transactions)
        .where(eq(transactions.documentId, documentId));

      // 2️⃣ Insert corrected transactions
      for (const t of newTransactions) {
        await tx.insert(transactions).values({
          documentId,
          docNo: t.docNo,
          executionDate: t.executionDate,
          registrationDate: t.registrationDate,
          nature: t.nature,
          considerationValue: t.considerationValue,
          marketValue: t.marketValue,
          surveyNumbers: t.surveyNumbers ?? [],
          plotNumber: t.plotNumber ?? null,
          extent: t.extent ?? null,
          buyerName: t.buyerName ?? null,
          sellerName: t.sellerName ?? null,
        });
      }

      // 3️⃣ Finalize document
      await tx
        .update(documents)
        .set({
          status: "MANUAL_OVERRIDE",
          confidence: 100,
          progress: 100,
        })
        .where(eq(documents.id, documentId));
    });
  }

  /**
  * Fetch all documents belonging to a user.
  *
  * Sorted by newest first.
  */
  async findByUserId(userId: string) {
    return db.query.documents.findMany({
        where: (documents, { eq }) =>
        eq(documents.userId, userId),
        orderBy: (documents, { desc }) =>
        desc(documents.createdAt),
    });
 }

 /**
 * Delete document by ID
 *
 * Transactions auto-delete due to
 * ON DELETE CASCADE in schema.
 */
  async delete(documentId: string) {
    await db
      .delete(documents)
      .where(eq(documents.id, documentId));
  }
}