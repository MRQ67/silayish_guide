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

export const DUPLICATE_CODE_ERROR_MESSAGE =
  "That code is already used by another location."

export const REFERENCED_LOCATION_ERROR_MESSAGE =
  "This location still has places inside it. Move or delete them first."

/**
 * Handles database mutation errors for admin operations.
 * Maps duplicate code (23505) and foreign key reference (23503) errors to
 * safe user-facing explanations, while generic-logging all other errors.
 */
export function handleDatabaseMutationError(
  error: unknown,
  label: string = "[admin] mutation error"
): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const pgCode = String((error as { code: unknown }).code)
    if (pgCode === "23505") {
      return DUPLICATE_CODE_ERROR_MESSAGE
    }
    if (pgCode === "23503") {
      return REFERENCED_LOCATION_ERROR_MESSAGE
    }
  }

  return handleLocationError(error, label)
}

