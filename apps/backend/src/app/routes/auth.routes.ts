import { Router } from "express";
import { AuthService } from "../../domain/auth.service.js";

const router = Router();
const service = new AuthService();

/**
 * Register
 */
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await service.register(email, password);

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Login
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await service.login(email, password);

    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

export default router;