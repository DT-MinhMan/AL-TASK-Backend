import { createHash, randomBytes } from 'crypto';

export function hashTokenSha256(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateFamilyId(bytes: number = 16): string {
  return randomBytes(bytes).toString('hex');
}
