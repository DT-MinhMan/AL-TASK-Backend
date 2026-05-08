import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
} from 'class-validator';

const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\W]{8,}$/;
const strongPasswordMessage =
  'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số';

export class RequestPasswordResetDto {
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  email!: string;

  @IsIn(['link', 'otp'], { message: 'Phương thức reset phải là link hoặc otp.' })
  resetMethod!: 'link' | 'otp';
}

export class ResetPasswordWithTokenDto {
  @IsString({ message: 'Token phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Token không được để trống.' })
  token!: string;

  @IsString({ message: 'Mật khẩu mới phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống.' })
  @Matches(strongPasswordPattern, { message: strongPasswordMessage })
  newPassword!: string;
}

export class ResetPasswordWithOtpDto {
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  email!: string;

  @IsString({ message: 'OTP phải là chuỗi ký tự.' })
  @Matches(/^\d{6}$/, { message: 'OTP phải gồm đúng 6 chữ số.' })
  otp!: string;

  @IsString({ message: 'Mật khẩu mới phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống.' })
  @Matches(strongPasswordPattern, { message: strongPasswordMessage })
  newPassword!: string;
}

export class VerifyOtpDto {
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  email!: string;

  @IsString({ message: 'OTP phải là chuỗi ký tự.' })
  @Matches(/^\d{6}$/, { message: 'OTP phải gồm đúng 6 chữ số.' })
  otp!: string;
}
