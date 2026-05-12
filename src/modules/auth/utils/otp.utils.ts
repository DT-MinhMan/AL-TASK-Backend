import { randomInt } from 'crypto';

// SEC-5: cryptographically secure OTP
export function generateOtpCode(): string {
  return randomInt(100000, 1000000).toString();
}
