export class RequestPasswordResetDto {
  email: string;
  resetMethod: 'link' | 'otp';
}

export class ResetPasswordWithTokenDto {
  token: string;
  newPassword: string;
}

export class ResetPasswordWithOtpDto {
  email: string;
  otp: string;
  newPassword: string;
}

export class VerifyOtpDto {
  email: string;
  otp: string;
}