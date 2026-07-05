"use server";

import { redirect } from "next/navigation";

import { runtimeEnv } from "@/lib/env";
import { createOrReuseCheckoutForPublicInvoice } from "@/server/invoices";

function normalizeAppUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().replace(/\/$/, "");

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function getCheckoutAppUrl() {
  return normalizeAppUrl(runtimeEnv.appUrl) ?? "http://localhost:3000";
}

export async function payInvoiceAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();

  if (!token) {
    redirect("/");
  }

  const appUrl = getCheckoutAppUrl();
  const checkoutUrl = await createOrReuseCheckoutForPublicInvoice(token, {
    appUrl,
  });

  redirect(checkoutUrl);
}
