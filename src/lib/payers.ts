export type PayerInput = {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  externalId?: string | null;
};

export type ValidPayerInput = {
  fullName: string;
  email: string | null;
  phone: string | null;
  externalId: string | null;
};

export type PayerValidationErrors = Partial<Record<keyof PayerInput, string>>;

export type PayerValidationResult =
  | { ok: true; data: ValidPayerInput }
  | { ok: false; errors: PayerValidationErrors };

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function validatePayerInput(input: PayerInput): PayerValidationResult {
  const errors: PayerValidationErrors = {};
  const fullName = input.fullName.trim();
  const email = normalizeOptionalText(input.email);
  const phone = normalizeOptionalText(input.phone);
  const externalId = normalizeOptionalText(input.externalId);

  if (fullName.length < 2) {
    errors.fullName = "Enter a payer name.";
  }

  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = "Enter a valid email address or leave it blank.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      fullName,
      email,
      phone,
      externalId,
    },
  };
}
