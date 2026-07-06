"use client";

import { Download, Printer, ReceiptText, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";

export type ReceiptViewerData = {
  organizationName: string;
  receiptNumber: string;
  invoiceNumber: string;
  payerName: string;
  collectionName: string;
  amountLabel: string;
  paymentMethod: string;
  paymentReference: string;
  paidAtLabel: string;
  issuedAtLabel: string;
};

type ReceiptViewerProps = {
  receipt: ReceiptViewerData;
};

function ReceiptDocument({ receipt }: ReceiptViewerProps) {
  const rows = [
    ["Receipt number", receipt.receiptNumber],
    ["Invoice number", receipt.invoiceNumber],
    ["Payer", receipt.payerName],
    ["Collection", receipt.collectionName],
    ["Payment method", receipt.paymentMethod],
    ["Payment reference", receipt.paymentReference],
    ["Paid date", receipt.paidAtLabel],
    ["Issued date", receipt.issuedAtLabel],
  ];

  return (
    <article
      className="receipt-print-document rounded-xl border border-border bg-surface p-5 text-left shadow-[var(--shadow-soft)]"
      data-receipt-print-area
    >
      <div className="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <ReceiptText aria-hidden="true" className="size-5" />
            <p className="text-sm font-semibold uppercase tracking-[0.08em]">
              SettleHQ Receipt
            </p>
          </div>
          <h3 className="mt-3 text-xl font-semibold text-foreground">
            {receipt.organizationName}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Official payment receipt
          </p>
        </div>
        <div className="rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
          Paid
        </div>
      </div>

      <div className="py-6">
        <p className="text-sm text-muted-foreground">Amount paid</p>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
          {receipt.amountLabel}
        </p>
      </div>

      <dl className="grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-muted/35 p-3">
            <dt className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {label}
            </dt>
            <dd className="mt-1 break-words text-sm font-medium text-foreground">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
        This receipt confirms that SettleHQ recorded a verified payment for the
        invoice listed above.
      </p>
    </article>
  );
}

export function ReceiptViewer({ receipt }: ReceiptViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  function printReceipt() {
    const previousTitle = document.title;
    document.title = receipt.receiptNumber;
    window.print();

    window.setTimeout(() => {
      document.title = previousTitle;
    }, 300);
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setIsOpen(true)}>
        View receipt
        <ReceiptText aria-hidden="true" data-icon="inline-end" />
      </Button>

      {isOpen ? (
        <div
          aria-labelledby={titleId}
          aria-modal="true"
          className="fixed inset-0 z-50 flex min-h-dvh items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm"
          data-receipt-modal-backdrop
          role="dialog"
        >
          <div className="max-h-[calc(100dvh-48px)] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-background p-4 shadow-2xl sm:p-5">
            <div
              className="mb-4 flex flex-wrap items-center justify-between gap-3"
              data-receipt-modal-actions
            >
              <div>
                <p className="text-sm text-muted-foreground">Receipt preview</p>
                <h2 className="text-lg font-semibold" id={titleId}>
                  {receipt.receiptNumber}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={printReceipt}>
                  Download receipt
                  <Download aria-hidden="true" data-icon="inline-end" />
                </Button>
                <Button type="button" variant="ghost" onClick={printReceipt}>
                  <Printer aria-hidden="true" />
                  <span className="sr-only">Print receipt</span>
                </Button>
                <Button
                  aria-label="Close receipt preview"
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
            </div>

            <ReceiptDocument receipt={receipt} />
          </div>
        </div>
      ) : null}
    </>
  );
}
