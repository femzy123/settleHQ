"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  createCollectionAction,
  type CollectionActionState,
} from "@/app/collections/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const initialState: CollectionActionState = {};

type CollectionFormPayer = {
  id: number;
  fullName: string;
  email: string | null;
  externalId: string | null;
};

type CollectionFormProps = {
  payers: CollectionFormPayer[];
};

export function CollectionForm({ payers }: CollectionFormProps) {
  const [state, formAction, isPending] = useActionState(
    createCollectionAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {state.message ? (
        <div
          role="alert"
          className="rounded-lg border border-danger bg-danger/10 px-4 py-3 text-sm text-foreground"
        >
          {state.message}
        </div>
      ) : null}

      <section className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">Collection details</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Define the obligation. Invoices and payment instructions are
            generated in the next step of the product workflow.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Collection name</Label>
            <Input
              id="name"
              name="name"
              aria-invalid={Boolean(state.errors?.name)}
              aria-describedby={state.errors?.name ? "name-error" : undefined}
              placeholder="Term 2 school fees"
              required
            />
            {state.errors?.name ? (
              <p id="name-error" role="alert" className="text-sm text-danger">
                {state.errors.name}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Optional context for your finance team."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">Amount per payer</Label>
              <Input
                id="amount"
                name="amount"
                inputMode="decimal"
                aria-invalid={Boolean(state.errors?.amount)}
                aria-describedby={
                  state.errors?.amount ? "amount-error" : "amount-help"
                }
                placeholder="150000"
                required
              />
              <p id="amount-help" className="text-sm text-muted-foreground">
                Enter the NGN amount before fees or payment instructions.
              </p>
              {state.errors?.amount ? (
                <p
                  id="amount-error"
                  role="alert"
                  className="text-sm text-danger"
                >
                  {state.errors.amount}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="dueDate">Due date</Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                aria-invalid={Boolean(state.errors?.dueDate)}
                aria-describedby={
                  state.errors?.dueDate ? "due-date-error" : undefined
                }
                required
              />
              {state.errors?.dueDate ? (
                <p
                  id="due-date-error"
                  role="alert"
                  className="text-sm text-danger"
                >
                  {state.errors.dueDate}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Select payers</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Each selected payer will be attached to this draft collection.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {payers.length} available
          </p>
        </div>

        {state.errors?.payerIds ? (
          <p role="alert" className="mb-4 text-sm text-danger">
            {state.errors.payerIds}
          </p>
        ) : null}

        <div className="divide-y divide-border rounded-lg border border-border">
          {payers.map((payer) => (
            <label
              key={payer.id}
              htmlFor={`payer-${payer.id}`}
              className="flex cursor-pointer items-start gap-3 p-4 hover:bg-muted/70"
            >
              <Checkbox
                id={`payer-${payer.id}`}
                name="payerIds"
                value={String(payer.id)}
                className="mt-1"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{payer.fullName}</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {[payer.externalId, payer.email]
                    .filter(Boolean)
                    .join(" � ") || "No contact details yet"}
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href="/collections"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          Cancel
        </Link>
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Creating draft..." : "Create draft collection"}
        </Button>
      </div>
    </form>
  );
}
