"use server";

import { redirect } from "next/navigation";

import { runtimeEnv } from "@/lib/env";
import { createOrReuseCheckoutForPublicInvoice } from "@/server/invoices";

export async function payInvoiceAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();

  if (!token) {
    redirect("/");
  }

  const appUrl = runtimeEnv.appUrl;

  if (!appUrl) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is required to create Checkout orders.",
    );
  }

  const checkoutUrl = await createOrReuseCheckoutForPublicInvoice(token, {
    appUrl,
  });

  redirect(checkoutUrl);
}
