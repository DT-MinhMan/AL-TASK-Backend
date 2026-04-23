import { IsString, IsEmail, IsOptional, IsEnum, IsUrl, Matches, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

// 📄 DTO cho cập nhật thông tin người dùng
export class UpdateUsersDto {
  @IsOptional()
  @IsString()
  googleId?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\W]{8,}$/, {
    message: 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số',
  })
  password?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['user', 'admin', 'staff', 'manager', 'technical'], {
    message: 'Role không hợp lệ',
  })
  role?: string;

  @IsOptional()
  @IsMongoId()
  roleId?: Types.ObjectId;

  @IsOptional()
  @IsString()
  @IsEnum(['active', 'inactive', 'banned'], {
    message: 'Trạng thái không hợp lệ',
  })
  status?: string;

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
