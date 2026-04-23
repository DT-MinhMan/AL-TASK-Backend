// 📁 src/modules/auth/dtos/auth.dto.ts

import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsString,
  IsIn,
} from 'class-validator';

/**
 * 📥 **Data Transfer Object (DTO) cho Đăng ký Người dùng**
 */
export class RegisterDto {
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  email!: string;

  @IsNotEmpty({ message: 'Mật khẩu không được để trống.' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự.' })
  password!: string;

  // 🆕 Role được lưu dưới dạng chuỗi với các giá trị tên cụ thể
  @IsOptional()
  @IsString({ message: 'Role phải là kiểu chuỗi.' })
  @IsIn(['user', 'admin', 'staff', 'manager', 'technician'], {
    message:
      'Role phải là một trong các giá trị: user, admin, staff, manager, technician',
  })
  role: string = 'user'; // Role mặc định là "user"
}

/**
 * 🔐 **DTO cho Đăng nhập Người dùng**
 */
export class LoginDto {
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  email!: string;

  @IsNotEmpty({ message: 'Mật khẩu không được để trống.' })
  password!: string;
}

/**
 * 🛠️ **DTO Cập nhật Thông tin Người dùng**
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'Tên đầy đủ phải là chuỗi ký tự.' })
  fullName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  email?: string;

  @IsOptional()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự.' })
  password?: string;

  @IsOptional()
  @IsString({ message: 'URL avatar phải là chuỗi ký tự.' })
  avatarUrl?: string;

  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự.' })
  phoneNumber?: string;

  // 🆕 Role cũng được lưu dưới dạng chuỗi trong quá trình cập nhật người dùng
  @IsOptional()
  @IsString({ message: 'Role phải là kiểu chuỗi.' })
  @IsIn(['user', 'admin', 'staff', 'manager', 'technician'], {
    message:
      'Role phải là một trong các giá trị: user, admin, staff, manager, technician',
  })
  role?: string;
}

export class VerifyEmailDto {
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  email!: string;

  @IsNotEmpty({ message: 'Mã xác thực không được để trống.' })
  code!: string;
}
