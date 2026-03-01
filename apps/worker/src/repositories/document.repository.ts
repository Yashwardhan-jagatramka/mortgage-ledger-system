import { db, documents, eq } from "@mortgage/db";

export class DocumentRepository {

  async getById(id: string) {
    const result = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));

    return result[0];
  }

  async updateStatus(id: string, status: string) {
    await db
      .update(documents)
      .set({ status })
      .where(eq(documents.id, id));
  }

  async updateProgress(id: string, progress: number) {
    await db
      .update(documents)
      .set({ progress })
      .where(eq(documents.id, id));
  }

  async markFailed(id: string, reason: string) {
    await db
      .update(documents)
      .set({
        status: "FAILED",
        errorMessage: reason,
      })
      .where(eq(documents.id, id));
  }
}