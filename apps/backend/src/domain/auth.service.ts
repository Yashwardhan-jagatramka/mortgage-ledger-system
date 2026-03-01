import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { UserRepository } from "../repositories/user.repository.js";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

export class AuthService {
  private repo = new UserRepository();

  /**
   * Register new user
   */
  async register(email: string, password: string) {

    const existing = await this.repo.findByEmail(email);
    if (existing) {
      throw new Error("User already exists");
    }

    const hashed = await bcrypt.hash(password, 10);

    await this.repo.create({
      id: uuidv4(),
      email,
      password: hashed,
      createdAt: new Date(),
    });

    return { message: "User registered successfully" };
  }

  /**
   * Login user and generate JWT
   */
  async login(email: string, password: string) {

    const user = await this.repo.findByEmail(email);

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    return { token };
  }
}