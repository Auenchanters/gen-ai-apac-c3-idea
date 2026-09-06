/** An error whose public message is deliberately safe to disclose. */
export class AppError extends Error {
  /** Creates a stable API error.
   * @param status - HTTP status.
   * @param code - Stable machine-readable code.
   * @param safeMessage - Static, non-sensitive description.
   */
  constructor(
    public readonly status: number,
    public readonly code: string,
    safeMessage: string
  ) {
    super(safeMessage);
    this.name = 'AppError';
  }
}

/** Returns an indistinguishable missing or foreign-resource error.
 * @returns Safe missing-resource failure.
 */
export function notFound(): AppError {
  return new AppError(404, 'NOT_FOUND', 'This item is unavailable.');
}
