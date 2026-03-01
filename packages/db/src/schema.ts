import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),

  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  status: varchar("status", { length: 50 }).notNull(),

  progress: integer("progress").default(0).notNull(),
  errorMessage: text("error_message"),

  retryCount: integer("retry_count").default(0).notNull(),

  confidence: integer("confidence"), // store as percentage 0–100

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),

  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),

  docNo: varchar("doc_no", { length: 50 }),
  executionDate: varchar("execution_date", { length: 50 }),
  registrationDate: varchar("registration_date", { length: 50 }),
  nature: varchar("nature", { length: 100 }),

  considerationValue: varchar("consideration_value", { length: 50 }),
  marketValue: varchar("market_value", { length: 50 }),

  surveyNumbers: jsonb("survey_numbers"),
  plotNumber: varchar("plot_number", { length: 50 }),
  extent: varchar("extent", { length: 50 }),

  buyerName: varchar("buyer_name", { length: 255 }),
  sellerName: varchar("seller_name", { length: 255 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),

  natureEnglish: text("nature_english"),

  buyerNameEnglish: text("buyer_name_english"),
  sellerNameEnglish: text("seller_name_english"),

});