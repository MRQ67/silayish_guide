export const DEFAULT_LOCATION_ERROR_MESSAGE =
  "We couldn't load campus locations right now. Please try again later."

/**
 * Logs detailed error information on the server (terminal/hosting logs)
 * and returns a safe, generic message to display to visitors.
 * Prevents leakage of internal database schema, tables, or environment details.
 */
export function handleLocationError(
  error: unknown,
  label: string = "[locations] failed to load"
): string {
  console.error(label, error)
  return DEFAULT_LOCATION_ERROR_MESSAGE
}
