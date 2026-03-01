import { Router } from "express";
import { DocumentService } from "../../domain/document.service.js";
import multer from "multer";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET_NAME } from "../../infrastructure/s3.client.js";
import { v4 as uuidv4 } from "uuid";
import { authMiddleware } from "../../middleware/auth.middleware.js";

/**
 * Route Layer
 * -----------
 * Responsibilities:
 * - Parse HTTP request
 * - Call service layer
 * - Return HTTP response
 *
 * All routes here are mounted under:
 * app.use("/documents", documentRoutes)
 */

const router = Router();
const service = new DocumentService();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Upload Document
 * POST /documents/upload
 */
router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const userId = req.user.userId;
      const documentId = uuidv4();
      const key = `${documentId}.pdf`;

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          Body: req.file.buffer,
          ContentType: "application/pdf",
        })
      );

      const fileUrl = `http://localhost:9000/${BUCKET_NAME}/${key}`;

      const result = await service.createDocument(
        userId,
        req.file.originalname,
        fileUrl
      );

      res.status(201).json({
        ...result,
        fileUrl,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * ✅ List My Documents
 * GET /documents
 */
router.get(
  "/",
  authMiddleware,
  async (req: any, res) => {
    try {
      const userId = req.user.userId;
      const docs = await service.listUserDocuments(userId);

      res.json({
        count: docs.length,
        data: docs,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Get Document Metadata
 * GET /documents/:id
 */
router.get("/:id", authMiddleware, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const doc = await service.getDocument(id, userId);
    res.json(doc);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * Get Transactions
 * GET /documents/:id/transactions
 */
router.get("/:id/transactions", authMiddleware, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const filters = {
      docNo: req.query.docNo as string | undefined,
      buyerName: req.query.buyerName as string | undefined,
      sellerName: req.query.sellerName as string | undefined,
      surveyNumber: req.query.surveyNumber as string | undefined,
      plotNumber: req.query.plotNumber as string | undefined,
    };

    const transactions = await service.getTransactions(
      id,
      userId,
      filters
    );

    res.json({
      count: transactions.length,
      data: transactions,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Manual Override
 * PUT /documents/:id/manual
 */
router.put("/:id/manual", authMiddleware, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { transactions } = req.body;

    const result = await service.manualOverride(
      id,
      userId,
      transactions
    );

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Delete Document
 * DELETE /documents/:id
 *
 * - User scoped
 * - Deletes document
 * - Cascades transactions automatically
 */
router.delete("/:id", authMiddleware, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    await service.deleteDocument(id, userId);

    res.json({ message: "Document deleted successfully" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;