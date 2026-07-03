export type CollectionInput = {
  name: string;
  description?: string | null;
  amount: string;
  dueDate: string;
  payerIds: Array<string | number>;
};

export type ValidCollectionInput = {
  name: string;
  description: string | null;
  amountKobo: number;
  dueDate: string;
  payerIds: number[];
};

export type CollectionValidationErrors = Partial<
  Record<keyof CollectionInput, string>
>;

export type CollectionValidationResult =
  | { ok: true; data: ValidCollectionInput }
  | { ok: false; errors: CollectionValidationErrors };

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function parseNairaToKobo(value: string) {
  const normalized = value.trim().replace(/,/g, "");

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [nairaPart, koboPart = ""] = normalized.split(".");
  const naira = Number(nairaPart);
  const kobo = Number(koboPart.padEnd(2, "0"));
  const amountKobo = naira * 100 + kobo;

  return Number.isSafeInteger(amountKobo) ? amountKobo : null;
}

function normalizeDueDate(value: string) {
  const normalized = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }

  const date = new Date(`${normalized}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10) === normalized ? normalized : null;
}

function normalizePayerIds(values: Array<string | number>) {
  const ids = new Set<number>();

  for (const value of values) {
    const normalized = Number(value);

    if (!Number.isInteger(normalized) || normalized <= 0) {
      return null;
    }

    ids.add(normalized);
  }

  return Array.from(ids);
}

export function validateCollectionInput(
  input: CollectionInput,
): CollectionValidationResult {
  const errors: CollectionValidationErrors = {};
  const name = input.name.trim();
  const description = normalizeOptionalText(input.description);
  const amountKobo = parseNairaToKobo(input.amount);
  const dueDate = normalizeDueDate(input.dueDate);
  const payerIds = normalizePayerIds(input.payerIds);

  if (name.length < 2) {
    errors.name = "Enter a collection name.";
  }

  if (!amountKobo || amountKobo <= 0) {
    errors.amount = "Enter a valid amount greater than zero.";
  }

  if (!dueDate) {
    errors.dueDate = "Enter a valid due date.";
  }

  if (!payerIds || payerIds.length === 0) {
    errors.payerIds = "Select at least one payer.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      name,
      description,
      amountKobo: amountKobo as number,
      dueDate: dueDate as string,
      payerIds: payerIds as number[],
    },
  };
}
