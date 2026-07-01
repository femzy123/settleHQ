CREATE TABLE "collection_payers" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "collection_payers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"collection_id" bigint NOT NULL,
	"payer_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_payers_unique_payer_per_collection" UNIQUE("collection_id","payer_id")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "collections_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"amount_kobo" bigint NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"due_date" date NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by_user_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_payment_options" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "invoice_payment_options_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"invoice_id" bigint NOT NULL,
	"organization_nomba_account_id" bigint,
	"provider" text DEFAULT 'nomba' NOT NULL,
	"option_type" text NOT NULL,
	"provider_reference" text,
	"provider_session_id" text,
	"account_number" text,
	"account_name" text,
	"bank_name" text,
	"checkout_url" text,
	"expected_amount_kobo" bigint NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"raw_provider_response" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "invoices_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"collection_id" bigint NOT NULL,
	"payer_id" bigint NOT NULL,
	"invoice_number" text NOT NULL,
	"amount_due_kobo" bigint NOT NULL,
	"amount_paid_kobo" bigint DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"due_date" date NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number"),
	CONSTRAINT "invoices_unique_payer_per_collection" UNIQUE("collection_id","payer_id")
);
--> statement-breakpoint
CREATE TABLE "organization_bank_accounts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_bank_accounts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"bank_name" text NOT NULL,
	"bank_code" text,
	"account_number" text NOT NULL,
	"account_name" text NOT NULL,
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"raw_provider_response" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_bank_accounts_unique_per_org" UNIQUE("organization_id","bank_code","account_number")
);
--> statement-breakpoint
CREATE TABLE "organization_memberships" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_memberships_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_memberships_unique_user_org" UNIQUE("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organization_nomba_accounts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_nomba_accounts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"provider" text DEFAULT 'nomba' NOT NULL,
	"provider_account_id" text NOT NULL,
	"account_type" text DEFAULT 'sub_account' NOT NULL,
	"account_name" text,
	"account_number" text,
	"bank_name" text,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_hackathon_shared" boolean DEFAULT false NOT NULL,
	"last_known_balance_kobo" bigint,
	"balance_synced_at" timestamp with time zone,
	"raw_provider_response" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organizations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"organization_type" text DEFAULT 'other' NOT NULL,
	"email" text,
	"phone" text,
	"logo_url" text,
	"created_by_user_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payers" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"full_name" text NOT NULL,
	"email" text,
	"phone" text,
	"external_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payers_unique_external_id_per_org" UNIQUE("organization_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"invoice_id" bigint NOT NULL,
	"collection_id" bigint NOT NULL,
	"payer_id" bigint NOT NULL,
	"invoice_payment_option_id" bigint,
	"organization_nomba_account_id" bigint,
	"webhook_event_id" bigint,
	"amount_kobo" bigint NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"payment_method" text DEFAULT 'unknown' NOT NULL,
	"provider" text DEFAULT 'nomba' NOT NULL,
	"provider_reference" text NOT NULL,
	"provider_session_id" text,
	"provider_status" text NOT NULL,
	"verification_status" text DEFAULT 'verified' NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone,
	"raw_provider_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_unique_provider_reference" UNIQUE("provider","provider_reference")
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "receipts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"payment_id" bigint NOT NULL,
	"invoice_id" bigint NOT NULL,
	"payer_id" bigint NOT NULL,
	"receipt_number" text NOT NULL,
	"amount_kobo" bigint NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"pdf_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "receipts_receipt_number_unique" UNIQUE("receipt_number"),
	CONSTRAINT "receipts_unique_payment" UNIQUE("payment_id")
);
--> statement-breakpoint
CREATE TABLE "reconciliation_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reconciliation_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint,
	"webhook_event_id" bigint,
	"payment_id" bigint,
	"invoice_id" bigint,
	"invoice_payment_option_id" bigint,
	"reconciliation_status" text NOT NULL,
	"match_type" text DEFAULT 'none' NOT NULL,
	"confidence_score" numeric(5, 2),
	"expected_amount_kobo" bigint,
	"received_amount_kobo" bigint,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"clerk_user_id" text NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "webhook_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint,
	"invoice_id" bigint,
	"provider" text DEFAULT 'nomba' NOT NULL,
	"provider_event_id" text,
	"event_type" text,
	"provider_reference" text,
	"provider_session_id" text,
	"provider_account_id" text,
	"signature_valid" boolean,
	"processing_status" text DEFAULT 'received' NOT NULL,
	"headers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "withdrawals" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "withdrawals_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" bigint NOT NULL,
	"organization_nomba_account_id" bigint NOT NULL,
	"destination_bank_account_id" bigint NOT NULL,
	"amount_kobo" bigint NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"provider" text DEFAULT 'nomba' NOT NULL,
	"provider_reference" text,
	"is_fake" boolean DEFAULT true NOT NULL,
	"requested_by_user_id" bigint,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"raw_provider_response" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collection_payers" ADD CONSTRAINT "collection_payers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_payers" ADD CONSTRAINT "collection_payers_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_payers" ADD CONSTRAINT "collection_payers_payer_id_payers_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."payers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payment_options" ADD CONSTRAINT "invoice_payment_options_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payment_options" ADD CONSTRAINT "invoice_payment_options_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payment_options" ADD CONSTRAINT "invoice_payment_options_organization_nomba_account_id_organization_nomba_accounts_id_fk" FOREIGN KEY ("organization_nomba_account_id") REFERENCES "public"."organization_nomba_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payer_id_payers_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."payers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_bank_accounts" ADD CONSTRAINT "organization_bank_accounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_nomba_accounts" ADD CONSTRAINT "organization_nomba_accounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payers" ADD CONSTRAINT "payers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payer_id_payers_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."payers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_payment_option_id_invoice_payment_options_id_fk" FOREIGN KEY ("invoice_payment_option_id") REFERENCES "public"."invoice_payment_options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_nomba_account_id_organization_nomba_accounts_id_fk" FOREIGN KEY ("organization_nomba_account_id") REFERENCES "public"."organization_nomba_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_webhook_event_id_webhook_events_id_fk" FOREIGN KEY ("webhook_event_id") REFERENCES "public"."webhook_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_payer_id_payers_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."payers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_events" ADD CONSTRAINT "reconciliation_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_events" ADD CONSTRAINT "reconciliation_events_webhook_event_id_webhook_events_id_fk" FOREIGN KEY ("webhook_event_id") REFERENCES "public"."webhook_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_events" ADD CONSTRAINT "reconciliation_events_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_events" ADD CONSTRAINT "reconciliation_events_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_events" ADD CONSTRAINT "reconciliation_events_invoice_payment_option_id_invoice_payment_options_id_fk" FOREIGN KEY ("invoice_payment_option_id") REFERENCES "public"."invoice_payment_options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_organization_nomba_account_id_organization_nomba_accounts_id_fk" FOREIGN KEY ("organization_nomba_account_id") REFERENCES "public"."organization_nomba_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_destination_bank_account_id_organization_bank_accounts_id_fk" FOREIGN KEY ("destination_bank_account_id") REFERENCES "public"."organization_bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collection_payers_organization_id_idx" ON "collection_payers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "collection_payers_collection_id_idx" ON "collection_payers" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "collection_payers_payer_id_idx" ON "collection_payers" USING btree ("payer_id");--> statement-breakpoint
CREATE INDEX "collections_organization_id_idx" ON "collections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "collections_organization_status_idx" ON "collections" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "collections_organization_due_date_idx" ON "collections" USING btree ("organization_id","due_date");--> statement-breakpoint
CREATE INDEX "invoice_payment_options_organization_id_idx" ON "invoice_payment_options" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invoice_payment_options_invoice_id_idx" ON "invoice_payment_options" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_payment_options_one_active_type_per_invoice_idx" ON "invoice_payment_options" USING btree ("invoice_id","option_type") WHERE "invoice_payment_options"."status" in ('pending', 'active');--> statement-breakpoint
CREATE INDEX "invoices_organization_id_idx" ON "invoices" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invoices_collection_id_idx" ON "invoices" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "invoices_payer_id_idx" ON "invoices" USING btree ("payer_id");--> statement-breakpoint
CREATE INDEX "organization_bank_accounts_organization_id_idx" ON "organization_bank_accounts" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_bank_accounts_one_default_per_org_idx" ON "organization_bank_accounts" USING btree ("organization_id") WHERE "organization_bank_accounts"."is_default" = true;--> statement-breakpoint
CREATE INDEX "organization_memberships_user_id_idx" ON "organization_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organization_memberships_organization_id_idx" ON "organization_memberships" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_nomba_accounts_organization_id_idx" ON "organization_nomba_accounts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_nomba_accounts_provider_account_id_idx" ON "organization_nomba_accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_nomba_accounts_one_default_per_org_idx" ON "organization_nomba_accounts" USING btree ("organization_id") WHERE "organization_nomba_accounts"."is_default" = true;--> statement-breakpoint
CREATE INDEX "organizations_created_by_user_id_idx" ON "organizations" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "payers_organization_id_idx" ON "payers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "payers_organization_name_idx" ON "payers" USING btree ("organization_id","full_name");--> statement-breakpoint
CREATE INDEX "payments_organization_id_idx" ON "payments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "payments_invoice_id_idx" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "payments_collection_id_idx" ON "payments" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "payments_payer_id_idx" ON "payments" USING btree ("payer_id");--> statement-breakpoint
CREATE INDEX "payments_organization_paid_at_idx" ON "payments" USING btree ("organization_id","paid_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "receipts_organization_id_idx" ON "receipts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "receipts_invoice_id_idx" ON "receipts" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "receipts_payer_id_idx" ON "receipts" USING btree ("payer_id");--> statement-breakpoint
CREATE INDEX "reconciliation_events_organization_id_idx" ON "reconciliation_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "reconciliation_events_webhook_event_id_idx" ON "reconciliation_events" USING btree ("webhook_event_id");--> statement-breakpoint
CREATE INDEX "reconciliation_events_payment_id_idx" ON "reconciliation_events" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "reconciliation_events_invoice_id_idx" ON "reconciliation_events" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "reconciliation_events_status_idx" ON "reconciliation_events" USING btree ("organization_id","reconciliation_status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "webhook_events_organization_id_idx" ON "webhook_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "webhook_events_invoice_id_idx" ON "webhook_events" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_unique_provider_event_id_idx" ON "webhook_events" USING btree ("provider","provider_event_id") WHERE "webhook_events"."provider_event_id" is not null;--> statement-breakpoint
CREATE INDEX "webhook_events_processing_status_idx" ON "webhook_events" USING btree ("processing_status","received_at");--> statement-breakpoint
CREATE INDEX "withdrawals_organization_id_idx" ON "withdrawals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "withdrawals_nomba_account_id_idx" ON "withdrawals" USING btree ("organization_nomba_account_id");--> statement-breakpoint
CREATE INDEX "withdrawals_destination_bank_account_id_idx" ON "withdrawals" USING btree ("destination_bank_account_id");--> statement-breakpoint
CREATE INDEX "withdrawals_requested_by_user_id_idx" ON "withdrawals" USING btree ("requested_by_user_id");--> statement-breakpoint
CREATE INDEX "withdrawals_organization_status_idx" ON "withdrawals" USING btree ("organization_id","status","requested_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "withdrawals_provider_reference_idx" ON "withdrawals" USING btree ("provider","provider_reference") WHERE "withdrawals"."provider_reference" is not null;