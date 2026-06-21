import type { AppError } from "../types/app";

function parseErrorPayload(value: unknown): AppError | null {
  if (!value || typeof value !== "object") return null;
  if (!("message" in value) || typeof value.message !== "string" || !value.message.trim()) {
    return null;
  }

  const code =
    "code" in value && typeof value.code === "string" && value.code.trim()
      ? value.code
      : undefined;

  return {
    code,
    message: value.message,
  };
}

export function getAppError(error: unknown, fallback: string): AppError {
  const directPayload = parseErrorPayload(error);
  if (directPayload) return directPayload;

  if (error instanceof Error && error.message) {
    try {
      const parsed = JSON.parse(error.message) as unknown;
      const payload = parseErrorPayload(parsed);
      if (payload) return payload;
    } catch {
      // Ignore JSON parsing failures and fall back to the plain message.
    }
    return { message: error.message };
  }

  if (typeof error === "string" && error.trim()) {
    try {
      const parsed = JSON.parse(error) as unknown;
      const payload = parseErrorPayload(parsed);
      if (payload) return payload;
    } catch {
      // Ignore JSON parsing failures and fall back to the plain message.
    }
    return { message: error };
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return { message: error.message };
  }

  return { message: fallback };
}
