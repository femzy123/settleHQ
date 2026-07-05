import { NextResponse } from "next/server";

import {
  getPublicInvoiceByToken,
  syncCheckoutPaymentForPublicInvoice,
} from "@/server/invoices";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export const runtime = "nodejs";

export async function POST(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const processing = await syncCheckoutPaymentForPublicInvoice(token);
  const invoice = await getPublicInvoiceByToken(token);

  if (!invoice) {
    return NextResponse.json(
      { ok: false, error: "Invoice was not found.", processing },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    processing,
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      amountDueKobo: invoice.amountDueKobo,
      amountPaidKobo: invoice.amountPaidKobo,
      currency: invoice.currency,
    },
  });
}
