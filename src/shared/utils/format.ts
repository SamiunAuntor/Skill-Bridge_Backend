export function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-BD", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
