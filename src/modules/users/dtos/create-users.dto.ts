import { IsString, IsEmail, IsOptional, IsEnum, IsUrl, Matches, IsNotEmpty } from 'class-validator';

// 📄 DTO cho tạo người dùng mới
export class CreateUsersDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\W]{8,}$/, {
    message: 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số',
  })
  password: string;

  @IsOptional()
  @IsString()
  googleId?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['user', 'admin', 'staff', 'manager', 'technical'], {
    message: 'Role không hợp lệ',
  })
  role?: string = 'user';

  @IsOptional()
  @IsString()
  @IsEnum(['active', 'inactive', 'banned'], {
    message: 'Trạng thái không hợp lệ',
  })
  status?: string = 'active';

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  birthday?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['male', 'female', 'other'], {
    message: 'Giới tính không hợp lệ',
  })
  gender?: string;

  @IsOptional()
  @IsUrl()
  avatar?: string;
}
