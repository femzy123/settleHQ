export type InvoiceNumberInput = {
  organizationName: string;
  year: string | number;
  serial: string | number;
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

export function formatInvoiceNumber({
  organizationName,
  year,
  serial,
}: InvoiceNumberInput) {
  const organizationCode = getOrganizationInvoiceCode(organizationName);
  const normalizedYear = String(year).slice(0, 4);
  const normalizedSerial = String(serial).padStart(6, "0");

  return `SHQ-${organizationCode}-INV-${normalizedYear}-${normalizedSerial}`;
}
