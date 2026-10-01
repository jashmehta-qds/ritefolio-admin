// Maps database errors to client-safe messages so driver/SQLSTATE/schema
// details never reach the response body. Full errors are logged server-side.
const PG_ERROR_MESSAGES: Record<string, string> = {
  "23505": "A record with the same unique value already exists",
  "23503": "This record references, or is referenced by, other records",
  "23502": "A required field is missing",
  "23514": "One or more values are not allowed",
  "22001": "One or more values exceed the allowed length",
  "22003": "One or more numeric values are out of range",
  "22007": "One or more dates have an invalid format",
  "22008": "One or more dates are out of range",
  "22P02": "One or more values have an invalid format",
};

export function safeErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : undefined;

  return (code && PG_ERROR_MESSAGES[code]) || "An unexpected error occurred";
}

export function clampLimit(value: string | null, fallback = 50, max = 200) {
  const parsed = parseInt(value ?? "", 10);
  if (isNaN(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export function parsePage(value: string | null) {
  const parsed = parseInt(value ?? "", 10);
  return isNaN(parsed) || parsed < 1 ? 1 : parsed;
}
