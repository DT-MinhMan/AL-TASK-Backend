import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsIn,
  Matches,
} from 'class-validator';
import { GLOBAL_ROLES } from '../../../common/constants/global-role.constants';

export class RegisterDto {
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  email!: string;

  @IsNotEmpty({ message: 'Mật khẩu không được để trống.' })
  @Matches(  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/,
 {
    message:
      'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và kí tự đặc biệt!',
  })
  password!: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  email!: string;

  @IsNotEmpty({ message: 'Mật khẩu không được để trống.' })
  password!: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: 'Tên đầy đủ phải là chuỗi ký tự.' })
  fullName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  email?: string;

  @IsOptional()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\W]{8,}$/, {
    message:
      'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số',
  })
  password?: string;

  @IsOptional()
  @IsString({ message: 'URL avatar phải là chuỗi ký tự.' })
  avatarUrl?: string;

  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự.' })
  phoneNumber?: string;
}

export class UpdateUserDto extends UpdateProfileDto {
  @IsOptional()
  @IsString({ message: 'Role phải là kiểu chuỗi.' })
  @IsIn(Object.values(GLOBAL_ROLES), {
    message:
      'Role phải là một trong các giá trị: super_admin, user',
  })
  role?: string;
}

export class VerifyEmailDto {
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  email!: string;

  @IsNotEmpty({ message: 'Mã xác thực không được để trống.' })
  code!: string;
}
