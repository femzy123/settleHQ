"use client";

import { useActionState } from "react";

import {
  createOrganizationAction,
  type OnboardingActionState,
} from "@/app/onboarding/actions";
import { organizationTypes } from "@/lib/organizations";

const initialState: OnboardingActionState = {};

export function OnboardingForm() {
  const [state, formAction, isPending] = useActionState(
    createOrganizationAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      {state.message ? (
        <div
          role="alert"
          className="rounded-lg border border-danger bg-danger/10 px-4 py-3 text-sm text-foreground"
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-2">
        <label htmlFor="name" className="text-sm font-medium">
          Organization name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="organization"
          aria-invalid={Boolean(state.errors?.name)}
          aria-describedby={state.errors?.name ? "name-error" : undefined}
          className="h-11 rounded-lg border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground"
          placeholder="Bright Future Academy"
          required
        />
        {state.errors?.name ? (
          <p id="name-error" role="alert" className="text-sm text-danger">
            {state.errors.name}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <label htmlFor="organizationType" className="text-sm font-medium">
          Organization type
        </label>
        <select
          id="organizationType"
          name="organizationType"
          aria-invalid={Boolean(state.errors?.organizationType)}
          aria-describedby={
            state.errors?.organizationType
              ? "organization-type-error"
              : undefined
          }
          className="h-11 rounded-lg border border-border bg-input px-3 text-sm text-foreground"
          defaultValue="school"
          required
        >
          {organizationTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        {state.errors?.organizationType ? (
          <p
            id="organization-type-error"
            role="alert"
            className="text-sm text-danger"
          >
            {state.errors.organizationType}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(state.errors?.email)}
            aria-describedby={state.errors?.email ? "email-error" : undefined}
            className="h-11 rounded-lg border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground"
            placeholder="finance@school.com"
          />
          {state.errors?.email ? (
            <p id="email-error" role="alert" className="text-sm text-danger">
              {state.errors.email}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label htmlFor="phone" className="text-sm font-medium">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            aria-invalid={Boolean(state.errors?.phone)}
            aria-describedby={state.errors?.phone ? "phone-error" : undefined}
            className="h-11 rounded-lg border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground"
            placeholder="0800 000 0000"
          />
          {state.errors?.phone ? (
            <p id="phone-error" role="alert" className="text-sm text-danger">
              {state.errors.phone}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2">
        <label htmlFor="logoUrl" className="text-sm font-medium">
          Logo URL
        </label>
        <input
          id="logoUrl"
          name="logoUrl"
          type="url"
          aria-invalid={Boolean(state.errors?.logoUrl)}
          aria-describedby={
            state.errors?.logoUrl ? "logo-url-error" : undefined
          }
          className="h-11 rounded-lg border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground"
          placeholder="https://example.com/logo.png"
        />
        <p className="text-sm text-muted-foreground">
          Optional for now. Clerk keeps user avatars; organization logos can
          stay as URLs during the MVP.
        </p>
        {state.errors?.logoUrl ? (
          <p id="logo-url-error" role="alert" className="text-sm text-danger">
            {state.errors.logoUrl}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:hover:bg-primary"
      >
        {isPending ? "Creating workspace..." : "Create workspace"}
      </button>
    </form>
  );
}
