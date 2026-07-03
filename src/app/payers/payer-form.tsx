"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  createPayerAction,
  type PayerActionState,
  updatePayerAction,
} from "@/app/payers/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initialState: PayerActionState = {};

type PayerFormValues = {
  id?: number;
  fullName?: string;
  email?: string | null;
  phone?: string | null;
  externalId?: string | null;
};

type PayerFormProps = {
  mode: "create" | "edit";
  initialValues?: PayerFormValues;
};

export function PayerForm({ mode, initialValues }: PayerFormProps) {
  const action = mode === "create" ? createPayerAction : updatePayerAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const cancelHref = initialValues?.id
    ? `/payers/${initialValues.id}`
    : "/payers";

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {initialValues?.id ? (
        <input type="hidden" name="payerId" value={initialValues.id} />
      ) : null}

      {state.message ? (
        <div
          role="alert"
          className="rounded-lg border border-danger bg-danger/10 px-4 py-3 text-sm text-foreground"
        >
          {state.message}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          aria-invalid={Boolean(state.errors?.fullName)}
          aria-describedby={
            state.errors?.fullName ? "full-name-error" : undefined
          }
          defaultValue={initialValues?.fullName ?? ""}
          placeholder="John Doe"
          required
        />
        {state.errors?.fullName ? (
          <p id="full-name-error" role="alert" className="text-sm text-danger">
            {state.errors.fullName}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(state.errors?.email)}
            aria-describedby={state.errors?.email ? "email-error" : undefined}
            defaultValue={initialValues?.email ?? ""}
            placeholder="payer@example.com"
          />
          {state.errors?.email ? (
            <p id="email-error" role="alert" className="text-sm text-danger">
              {state.errors.email}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            aria-invalid={Boolean(state.errors?.phone)}
            aria-describedby={state.errors?.phone ? "phone-error" : undefined}
            defaultValue={initialValues?.phone ?? ""}
            placeholder="0800 000 0000"
          />
          {state.errors?.phone ? (
            <p id="phone-error" role="alert" className="text-sm text-danger">
              {state.errors.phone}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="externalId">External ID</Label>
        <Input
          id="externalId"
          name="externalId"
          aria-invalid={Boolean(state.errors?.externalId)}
          aria-describedby={
            state.errors?.externalId ? "external-id-error" : "external-id-help"
          }
          defaultValue={initialValues?.externalId ?? ""}
          placeholder="STU-1024 or FLAT-A12"
        />
        <p id="external-id-help" className="text-sm text-muted-foreground">
          Optional. Use your school admission number, tenant ID, member number,
          or another internal reference.
        </p>
        {state.errors?.externalId ? (
          <p
            id="external-id-error"
            role="alert"
            className="text-sm text-danger"
          >
            {state.errors.externalId}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href={cancelHref}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          Cancel
        </Link>
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending
            ? mode === "create"
              ? "Adding payer..."
              : "Saving payer..."
            : mode === "create"
              ? "Add payer"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
