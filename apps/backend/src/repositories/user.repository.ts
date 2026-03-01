import { db, users, eq } from "@mortgage/db";

export class UserRepository {

  async findByEmail(email: string) {
    return db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    });
  }

  async create(data: typeof users.$inferInsert) {
    return db.insert(users).values(data);
  }
}