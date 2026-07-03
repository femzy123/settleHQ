export type InvoiceNumberInput = {
  organizationName: string;
  year: string | number;
  serial: string | number;
  payerName?: string | null;
  payerExternalId?: string | null;
};

export function getOrganizationInvoiceCode(organizationName: string) {
  const words = organizationName
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
  const acronym = words.map((word) => word[0]).join("");
  const compact = words.join("");
  const code = acronym.length >= 2 ? acronym : compact;

  const normalizedCode = (code || "ORG").slice(0, 6);

  return normalizedCode.length === 1
    ? normalizedCode.padEnd(3, "X")
    : normalizedCode;
}

export function getPayerInvoiceCode(input: {
  payerName?: string | null;
  payerExternalId?: string | null;
}) {
  if (input.payerExternalId?.trim()) {
    const externalCode = input.payerExternalId
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 8);

    if (externalCode) {
      return externalCode;
    }
  }

  const words = (input.payerName ?? "")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "PAY";
  }

  if (words.length === 1) {
    return words[0].slice(0, 8);
  }

  return `${words[0][0]}${words[words.length - 1]}`.slice(0, 8);
}

export function formatInvoiceNumber({
  organizationName,
  year,
  serial,
  payerName,
  payerExternalId,
}: InvoiceNumberInput) {
  const organizationCode = getOrganizationInvoiceCode(organizationName);
  const payerCode = getPayerInvoiceCode({ payerName, payerExternalId });
  const normalizedYear = String(year).slice(0, 4);
  const normalizedSerial = String(serial).padStart(6, "0");

  return `SHQ-${organizationCode}-${payerCode}-INV-${normalizedYear}-${normalizedSerial}`;
}
