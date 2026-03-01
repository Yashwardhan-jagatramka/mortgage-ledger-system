CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "nature_english" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "buyer_name_english" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "seller_name_english" text;