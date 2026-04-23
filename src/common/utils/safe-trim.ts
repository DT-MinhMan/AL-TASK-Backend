export function safeTrim(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined;
}
