import { ConfigService } from '@nestjs/config';

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
  path: string;
  domain?: string;
}

export const getCookieOptions = (configService: ConfigService): CookieOptions => {
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  const isProduction = nodeEnv === 'production';

  return {
    httpOnly: true, // ✅ Không cho JavaScript access (chỉ HTTP requests)
    secure: isProduction, // ✅ HTTPS only in production
    sameSite: isProduction ? 'strict' : 'lax', // ✅ CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/',
    domain: isProduction ? configService.get<string>('COOKIE_DOMAIN') : undefined,
  };
};

export const JWT_COOKIE_NAME = 'auth_token';
