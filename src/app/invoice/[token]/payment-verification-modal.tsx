"use client";

import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type VerificationState = "waiting" | "fallback" | "verified" | "delayed";

type InvoiceStatusResponse = {
  invoice?: {
    status: string;
    amountDueKobo: number;
    amountPaidKobo: number;
  };
};

type PaymentVerificationModalProps = {
  publicToken: string;
  pollIntervalMs?: number;
  fallbackDelayMs?: number;
};

function isInvoicePaid(response: InvoiceStatusResponse) {
  const invoice = response.invoice;

  if (!invoice) {
    return false;
  }

  return (
    invoice.status === "paid" || invoice.amountPaidKobo >= invoice.amountDueKobo
  );
}

async function readInvoiceStatus(publicToken: string) {
  const response = await fetch(`/api/invoices/public/${publicToken}/status`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as InvoiceStatusResponse;
}

async function verifyCheckout(publicToken: string) {
  const response = await fetch(`/api/invoices/public/${publicToken}/verify`, {
    method: "POST",
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as InvoiceStatusResponse;
}

export function PaymentVerificationModal({
  publicToken,
  pollIntervalMs = 5000,
  fallbackDelayMs = 15000,
}: PaymentVerificationModalProps) {
  const router = useRouter();
  const [state, setState] = useState<VerificationState>("waiting");
  const fallbackStartedRef = useRef(false);
  const finishedRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    startedAtRef.current = Date.now();
    fallbackStartedRef.current = false;
    finishedRef.current = false;

    function finishAsPaid() {
      if (cancelled || finishedRef.current) {
        return;
      }

      finishedRef.current = true;
      setState("verified");

      timeoutId = setTimeout(() => {
        router.replace(`/invoice/${publicToken}`);
        router.refresh();
      }, 800);
    }

    async function checkStatus() {
      if (cancelled || finishedRef.current) {
        return;
      }

      const status = await readInvoiceStatus(publicToken);

      if (status && isInvoicePaid(status)) {
        finishAsPaid();
        return;
      }

      const startedAt = startedAtRef.current ?? Date.now();
      const elapsedMs = Date.now() - startedAt;

      if (!fallbackStartedRef.current && elapsedMs >= fallbackDelayMs) {
        fallbackStartedRef.current = true;
        setState("fallback");

        const verification = await verifyCheckout(publicToken);

        if (verification && isInvoicePaid(verification)) {
          finishAsPaid();
          return;
        }

        if (!cancelled && !finishedRef.current) {
          setState("delayed");
        }
      }
    }

    void checkStatus();
    const intervalId = window.setInterval(() => {
      void checkStatus();
    }, pollIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [fallbackDelayMs, pollIntervalMs, publicToken, router]);

  const isVerified = state === "verified";
  const title = isVerified
    ? "Payment verified"
    : state === "fallback"
      ? "Confirming with Nomba"
      : state === "delayed"
        ? "Verification is taking longer"
        : "Verifying your payment";
  const description = isVerified
    ? "Your invoice has been marked as paid. We are refreshing the receipt details."
    : state === "fallback"
      ? "We are checking the Checkout transaction directly because confirmation has not arrived yet."
      : state === "delayed"
        ? "Your payment was submitted. This invoice will be marked as paid once confirmation is completed."
        : "Your payment was submitted. We are waiting for confirmation and will update this invoice once it is verified.";

  return (
    <div
      aria-labelledby="payment-verification-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex min-h-dvh items-center justify-center bg-black/55 px-5 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 text-center shadow-2xl sm:p-8">
        <div className="mx-auto flex size-24 items-center justify-center rounded-full border border-border bg-muted/45">
          {isVerified ? (
            <CheckCircle2 aria-hidden="true" className="size-12 text-primary" />
          ) : (
            <LoaderCircle
              aria-hidden="true"
              className="size-14 animate-spin text-primary"
            />
          )}
        </div>

        <h2
          className="mt-6 text-2xl font-semibold tracking-normal text-foreground"
          id="payment-verification-title"
        >
          {title}
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          {description}
        </p>

        <div className="mt-6 rounded-lg border border-border bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
          We check for webhook confirmation first. If it does not arrive after a
          short wait, we confirm the payment with Nomba Checkout.
        </div>

        {state === "delayed" ? (
          <Button
            className="mt-5 w-full"
            type="button"
            variant="outline"
            onClick={() => {
              router.replace(`/invoice/${publicToken}?payment_pending=1`);
              router.refresh();
            }}
          >
            Continue viewing invoice
          </Button>
        ) : null}
      </div>
    </div>
  );
}
