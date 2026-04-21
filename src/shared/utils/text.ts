export function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function toDisplayName(input: {
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const fullName = [input.firstName?.trim(), input.lastName?.trim()]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || normalizeText(input.name) || input.email;
}
