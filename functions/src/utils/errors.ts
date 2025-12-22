/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UTILS — ERRORS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Typed error classes and helpers for consistent error handling.
 *
 * Invariants:
 * - `AppError` carries a stable `code`.
 * - `isAppError` is safe to use in controllers to map to transport errors.
 * - `getErrorMessage` never throws and never returns secrets.
 */

export type ErrorCode =
    | "NOT_FOUND"
    | "PERMISSION_DENIED"
    | "INVALID_INPUT"
    | "ALREADY_EXISTS"
    | "INTERNAL";

export class AppError extends Error {
    constructor(
        public readonly code: ErrorCode,
        message: string
    ) {
        super(message);
        this.name = "AppError";
    }
}

export const isAppError = (error: unknown): error is AppError => {
    return error instanceof AppError;
};

/**
 * Best-effort error message extraction.
 * Use for logging and safe user-facing fallbacks.
 */
export function getErrorMessage(error: unknown): string | null {
    if (error == null) return null;
    if (typeof error === "string") return error;
    if (error instanceof Error) return error.message || null;
    try {
        // Some libraries throw plain objects with `message`
        const msg = (error as any)?.message;
        return typeof msg === "string" ? msg : null;
    } catch {
        return null;
    }
}
