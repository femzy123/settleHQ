import { NextResponse } from "next/server";

import { getPublicInvoiceByToken } from "@/server/invoices";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const invoice = await getPublicInvoiceByToken(token);

  if (!invoice) {
    return NextResponse.json(
      { ok: false, error: "Invoice was not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
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
