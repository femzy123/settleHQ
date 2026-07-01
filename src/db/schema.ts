import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const id = (name = "id") =>
  bigint(name, { mode: "number" }).primaryKey().generatedAlwaysAsIdentity();

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
const emptyJson = sql`'{}'::jsonb`;

export const users = pgTable("users", {
  id: id(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  createdAt,
  updatedAt,
});

export const organizations = pgTable("organizations", {
  id: id(),
  name: text("name").notNull(),
  organizationType: text("organization_type").notNull().default("other"),
  email: text("email"),
  phone: text("phone"),
  logoUrl: text("logo_url"),
  createdByUserId: bigint("created_by_user_id", { mode: "number" }).notNull().references(() => users.id),
  createdAt,
  updatedAt,
}, (table) => [
  index("organizations_created_by_user_id_idx").on(table.createdByUserId),
]);

export const organizationMemberships = pgTable("organization_memberships", {
  id: id(),
  organizationId: bigint("organization_id", { mode: "number" }).notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("owner"),
  createdAt,
}, (table) => [
  unique("organization_memberships_unique_user_org").on(table.organizationId, table.userId),
  index("organization_memberships_user_id_idx").on(table.userId),
  index("organization_memberships_organization_id_idx").on(table.organizationId),
]);

export const organizationNombaAccounts = pgTable("organization_nomba_accounts", {
  id: id(),
  organizationId: bigint("organization_id", { mode: "number" }).notNull().references(() => organizations.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("nomba"),
  providerAccountId: text("provider_account_id").notNull(),
  accountType: text("account_type").notNull().default("sub_account"),
  accountName: text("account_name"),
  accountNumber: text("account_number"),
  bankName: text("bank_name"),
  currency: text("currency").notNull().default("NGN"),
  status: text("status").notNull().default("active"),
  isDefault: boolean("is_default").notNull().default(false),
  isHackathonShared: boolean("is_hackathon_shared").notNull().default(false),
  lastKnownBalanceKobo: bigint("last_known_balance_kobo", { mode: "number" }),
  balanceSyncedAt: timestamp("balance_synced_at", { withTimezone: true }),
  rawProviderResponse: jsonb("raw_provider_response").notNull().default(emptyJson),
  createdAt,
  updatedAt,
}, (table) => [
  index("organization_nomba_accounts_organization_id_idx").on(table.organizationId),
  index("organization_nomba_accounts_provider_account_id_idx").on(table.provider, table.providerAccountId),
  uniqueIndex("organization_nomba_accounts_one_default_per_org_idx").on(table.organizationId).where(sql`${table.isDefault} = true`),
]);

export const organizationBankAccounts = pgTable("organization_bank_accounts", {
  id: id(),
  organizationId: bigint("organization_id", { mode: "number" }).notNull().references(() => organizations.id, { onDelete: "cascade" }),
  bankName: text("bank_name").notNull(),
  bankCode: text("bank_code"),
  accountNumber: text("account_number").notNull(),
  accountName: text("account_name").notNull(),
  verificationStatus: text("verification_status").notNull().default("pending"),
  isDefault: boolean("is_default").notNull().default(false),
  rawProviderResponse: jsonb("raw_provider_response").notNull().default(emptyJson),
  createdAt,
  updatedAt,
}, (table) => [
  unique("organization_bank_accounts_unique_per_org").on(table.organizationId, table.bankCode, table.accountNumber),
  index("organization_bank_accounts_organization_id_idx").on(table.organizationId),
  uniqueIndex("organization_bank_accounts_one_default_per_org_idx").on(table.organizationId).where(sql`${table.isDefault} = true`),
]);

export const payers = pgTable("payers", {
  id: id(),
  organizationId: bigint("organization_id", { mode: "number" }).notNull().references(() => organizations.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  externalId: text("external_id"),
  metadata: jsonb("metadata").notNull().default(emptyJson),
  createdAt,
  updatedAt,
}, (table) => [
  unique("payers_unique_external_id_per_org").on(table.organizationId, table.externalId),
  index("payers_organization_id_idx").on(table.organizationId),
  index("payers_organization_name_idx").on(table.organizationId, table.fullName),
]);

export const collections = pgTable("collections", {
  id: id(),
  organizationId: bigint("organization_id", { mode: "number" }).notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  amountKobo: bigint("amount_kobo", { mode: "number" }).notNull(),
  currency: text("currency").notNull().default("NGN"),
  dueDate: date("due_date").notNull(),
  status: text("status").notNull().default("draft"),
  createdByUserId: bigint("created_by_user_id", { mode: "number" }).notNull().references(() => users.id),
  createdAt,
  updatedAt,
}, (table) => [
  index("collections_organization_id_idx").on(table.organizationId),
  index("collections_organization_status_idx").on(table.organizationId, table.status),
  index("collections_organization_due_date_idx").on(table.organizationId, table.dueDate),
]);

export const collectionPayers = pgTable("collection_payers", {
  id: id(),
  organizationId: bigint("organization_id", { mode: "number" }).notNull().references(() => organizations.id, { onDelete: "cascade" }),
  collectionId: bigint("collection_id", { mode: "number" }).notNull().references(() => collections.id, { onDelete: "cascade" }),
  payerId: bigint("payer_id", { mode: "number" }).notNull().references(() => payers.id, { onDelete: "cascade" }),
  createdAt,
}, (table) => [
  unique("collection_payers_unique_payer_per_collection").on(table.collectionId, table.payerId),
  index("collection_payers_organization_id_idx").on(table.organizationId),
  index("collection_payers_collection_id_idx").on(table.collectionId),
  index("collection_payers_payer_id_idx").on(table.payerId),
]);

export const invoices = pgTable("invoices", {
  id: id(),
  organizationId: bigint("organization_id", { mode: "number" }).notNull().references(() => organizations.id, { onDelete: "cascade" }),
  collectionId: bigint("collection_id", { mode: "number" }).notNull().references(() => collections.id),
  payerId: bigint("payer_id", { mode: "number" }).notNull().references(() => payers.id),
  invoiceNumber: text("invoice_number").notNull().unique(),
  amountDueKobo: bigint("amount_due_kobo", { mode: "number" }).notNull(),
  amountPaidKobo: bigint("amount_paid_kobo", { mode: "number" }).notNull().default(0),
  currency: text("currency").notNull().default("NGN"),
  dueDate: date("due_date").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt,
  updatedAt,
}, (table) => [
  unique("invoices_unique_payer_per_collection").on(table.collectionId, table.payerId),
  index("invoices_organization_id_idx").on(table.organizationId),
  index("invoices_collection_id_idx").on(table.collectionId),
  index("invoices_payer_id_idx").on(table.payerId),
]);

export const invoicePaymentOptions = pgTable("invoice_payment_options", {
  id: id(),
  organizationId: bigint("organization_id", { mode: "number" }).notNull().references(() => organizations.id, { onDelete: "cascade" }),
  invoiceId: bigint("invoice_id", { mode: "number" }).notNull().references(() => invoices.id, { onDelete: "cascade" }),
  organizationNombaAccountId: bigint("organization_nomba_account_id", { mode: "number" }).references(() => organizationNombaAccounts.id),
  provider: text("provider").notNull().default("nomba"),
  optionType: text("option_type").notNull(),
  providerReference: text("provider_reference"),
  providerSessionId: text("provider_session_id"),
  accountNumber: text("account_number"),
  accountName: text("account_name"),
  bankName: text("bank_name"),
  checkoutUrl: text("checkout_url"),
  expectedAmountKobo: bigint("expected_amount_kobo", { mode: "number" }).notNull(),
  currency: text("currency").notNull().default("NGN"),
  status: text("status").notNull().default("active"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  rawProviderResponse: jsonb("raw_provider_response").notNull().default(emptyJson),
  createdAt,
  updatedAt,
}, (table) => [
  index("invoice_payment_options_organization_id_idx").on(table.organizationId),
  index("invoice_payment_options_invoice_id_idx").on(table.invoiceId),
  uniqueIndex("invoice_payment_options_one_active_type_per_invoice_idx").on(table.invoiceId, table.optionType).where(sql`${table.status} in ('pending', 'active')`),
]);

export const webhookEvents = pgTable("webhook_events", {
  id: id(),
  organizationId: bigint("organization_id", { mode: "number" }).references(() => organizations.id, { onDelete: "set null" }),
  invoiceId: bigint("invoice_id", { mode: "number" }).references(() => invoices.id, { onDelete: "set null" }),
  provider: text("provider").notNull().default("nomba"),
  providerEventId: text("provider_event_id"),
  eventType: text("event_type"),
  providerReference: text("provider_reference"),
  providerSessionId: text("provider_session_id"),
  providerAccountId: text("provider_account_id"),
  signatureValid: boolean("signature_valid"),
  processingStatus: text("processing_status").notNull().default("received"),
  headers: jsonb("headers").notNull().default(emptyJson),
  rawPayload: jsonb("raw_payload").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  errorMessage: text("error_message"),
}, (table) => [
  index("webhook_events_organization_id_idx").on(table.organizationId),
  index("webhook_events_invoice_id_idx").on(table.invoiceId),
  uniqueIndex("webhook_events_unique_provider_event_id_idx").on(table.provider, table.providerEventId).where(sql`${table.providerEventId} is not null`),
  index("webhook_events_processing_status_idx").on(table.processingStatus, table.receivedAt),
]);

export const payments = pgTable("payments", {
  id: id(),
  organizationId: bigint("organization_id", { mode: "number" }).notNull().references(() => organizations.id, { onDelete: "cascade" }),
  invoiceId: bigint("invoice_id", { mode: "number" }).notNull().references(() => invoices.id),
  collectionId: bigint("collection_id", { mode: "number" }).notNull().references(() => collections.id),
  payerId: bigint("payer_id", { mode: "number" }).notNull().references(() => payers.id),
  invoicePaymentOptionId: bigint("invoice_payment_option_id", { mode: "number" }).references(() => invoicePaymentOptions.id),
  organizationNombaAccountId: bigint("organization_nomba_account_id", { mode: "number" }).references(() => organizationNombaAccounts.id),
  webhookEventId: bigint("webhook_event_id", { mode: "number" }).references(() => webhookEvents.id),
  amountKobo: bigint("amount_kobo", { mode: "number" }).notNull(),
  currency: text("currency").notNull().default("NGN"),
  paymentMethod: text("payment_method").notNull().default("unknown"),
  provider: text("provider").notNull().default("nomba"),
  providerReference: text("provider_reference").notNull(),
  providerSessionId: text("provider_session_id"),
  providerStatus: text("provider_status").notNull(),
  verificationStatus: text("verification_status").notNull().default("verified"),
  paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  rawProviderPayload: jsonb("raw_provider_payload").notNull().default(emptyJson),
  createdAt,
}, (table) => [
  unique("payments_unique_provider_reference").on(table.provider, table.providerReference),
  index("payments_organization_id_idx").on(table.organizationId),
  index("payments_invoice_id_idx").on(table.invoiceId),
  index("payments_collection_id_idx").on(table.collectionId),
  index("payments_payer_id_idx").on(table.payerId),
  index("payments_organization_paid_at_idx").on(table.organizationId, table.paidAt.desc()),
]);

export const receipts = pgTable("receipts", {
  id: id(),
  organizationId: bigint("organization_id", { mode: "number" }).notNull().references(() => organizations.id, { onDelete: "cascade" }),
  paymentId: bigint("payment_id", { mode: "number" }).notNull().references(() => payments.id),
  invoiceId: bigint("invoice_id", { mode: "number" }).notNull().references(() => invoices.id),
  payerId: bigint("payer_id", { mode: "number" }).notNull().references(() => payers.id),
  receiptNumber: text("receipt_number").notNull().unique(),
  amountKobo: bigint("amount_kobo", { mode: "number" }).notNull(),
  currency: text("currency").notNull().default("NGN"),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  pdfUrl: text("pdf_url"),
  createdAt,
}, (table) => [
  unique("receipts_unique_payment").on(table.paymentId),
  index("receipts_organization_id_idx").on(table.organizationId),
  index("receipts_invoice_id_idx").on(table.invoiceId),
  index("receipts_payer_id_idx").on(table.payerId),
]);

export const reconciliationEvents = pgTable("reconciliation_events", {
  id: id(),
  organizationId: bigint("organization_id", { mode: "number" }).references(() => organizations.id, { onDelete: "set null" }),
  webhookEventId: bigint("webhook_event_id", { mode: "number" }).references(() => webhookEvents.id),
  paymentId: bigint("payment_id", { mode: "number" }).references(() => payments.id),
  invoiceId: bigint("invoice_id", { mode: "number" }).references(() => invoices.id),
  invoicePaymentOptionId: bigint("invoice_payment_option_id", { mode: "number" }).references(() => invoicePaymentOptions.id),
  reconciliationStatus: text("reconciliation_status").notNull(),
  matchType: text("match_type").notNull().default("none"),
  confidenceScore: numeric("confidence_score", { precision: 5, scale: 2 }),
  expectedAmountKobo: bigint("expected_amount_kobo", { mode: "number" }),
  receivedAmountKobo: bigint("received_amount_kobo", { mode: "number" }),
  reason: text("reason"),
  createdAt,
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
}, (table) => [
  index("reconciliation_events_organization_id_idx").on(table.organizationId),
  index("reconciliation_events_webhook_event_id_idx").on(table.webhookEventId),
  index("reconciliation_events_payment_id_idx").on(table.paymentId),
  index("reconciliation_events_invoice_id_idx").on(table.invoiceId),
  index("reconciliation_events_status_idx").on(table.organizationId, table.reconciliationStatus, table.createdAt.desc()),
]);

export const withdrawals = pgTable("withdrawals", {
  id: id(),
  organizationId: bigint("organization_id", { mode: "number" }).notNull().references(() => organizations.id, { onDelete: "cascade" }),
  organizationNombaAccountId: bigint("organization_nomba_account_id", { mode: "number" }).notNull().references(() => organizationNombaAccounts.id),
  destinationBankAccountId: bigint("destination_bank_account_id", { mode: "number" }).notNull().references(() => organizationBankAccounts.id),
  amountKobo: bigint("amount_kobo", { mode: "number" }).notNull(),
  currency: text("currency").notNull().default("NGN"),
  status: text("status").notNull().default("requested"),
  provider: text("provider").notNull().default("nomba"),
  providerReference: text("provider_reference"),
  isFake: boolean("is_fake").notNull().default(true),
  requestedByUserId: bigint("requested_by_user_id", { mode: "number" }).references(() => users.id),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  rawProviderResponse: jsonb("raw_provider_response").notNull().default(emptyJson),
}, (table) => [
  index("withdrawals_organization_id_idx").on(table.organizationId),
  index("withdrawals_nomba_account_id_idx").on(table.organizationNombaAccountId),
  index("withdrawals_destination_bank_account_id_idx").on(table.destinationBankAccountId),
  index("withdrawals_requested_by_user_id_idx").on(table.requestedByUserId),
  index("withdrawals_organization_status_idx").on(table.organizationId, table.status, table.requestedAt.desc()),
  uniqueIndex("withdrawals_provider_reference_idx").on(table.provider, table.providerReference).where(sql`${table.providerReference} is not null`),
]);
