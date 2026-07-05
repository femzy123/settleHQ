"use server";

import { headers } from "next/headers";
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

async function getCheckoutAppUrl() {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const forwardedProto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const host = forwardedHost ?? requestHeaders.get("host");

  if (host) {
    return `${forwardedProto}://${host}`.replace(/\/$/, "");
  }

  return (
    normalizeAppUrl(requestHeaders.get("origin")) ??
    normalizeAppUrl(process.env.VERCEL_URL) ??
    normalizeAppUrl(runtimeEnv.appUrl)
  );
}

export async function payInvoiceAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();

  if (!token) {
    redirect("/");
  }

  const appUrl = await getCheckoutAppUrl();

  if (!appUrl) {
    throw new Error("A public app URL is required to create Checkout orders.");
  }

  const checkoutUrl = await createOrReuseCheckoutForPublicInvoice(token, {
    appUrl,
  });

  redirect(checkoutUrl);
}
