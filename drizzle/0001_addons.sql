CREATE TABLE "addons" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_by" text NOT NULL,
	"created_by_name" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"bucket_key" text NOT NULL,
	"content_type" text DEFAULT 'image/jpeg' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "addons_org_idx" ON "addons" USING btree ("organization_id");