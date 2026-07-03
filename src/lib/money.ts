export function formatKoboAsNaira(amountKobo: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: amountKobo % 100 === 0 ? 0 : 2,
  }).format(amountKobo / 100);
}

export function formatDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
