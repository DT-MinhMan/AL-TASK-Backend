// Centralized durations/constants. Values match existing behavior.

export const AUTH_CONSTANTS = {
  ACCESS_TOKEN_EXPIRES_MS: 15 * 60 * 1000,
  REFRESH_TOKEN_EXPIRES_MS: 7 * 24 * 60 * 60 * 1000,
  PASSWORD_RESET_EXPIRES_MS: 15 * 60 * 1000,
  OTP_EXPIRES_MS: 15 * 60 * 1000,
  OTP_LENGTH: 6,

  // SEC-8 grace period to avoid false-positive concurrent refresh
  CONCURRENT_REFRESH_GRACE_MS: 15_000,
} as const;
