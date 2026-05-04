import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsString,
  IsIn,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email khong hop le.' })
  @IsNotEmpty({ message: 'Email khong duoc de trong.' })
  email!: string;

  @IsNotEmpty({ message: 'Mat khau khong duoc de trong.' })
  @MinLength(6, { message: 'Mat khau phai co it nhat 6 ky tu.' })
  password!: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Email khong hop le.' })
  email!: string;

  @IsNotEmpty({ message: 'Mat khau khong duoc de trong.' })
  password!: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'Ten day du phai la chuoi ky tu.' })
  fullName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email khong hop le.' })
  email?: string;

  @IsOptional()
  @MinLength(6, { message: 'Mat khau phai co it nhat 6 ky tu.' })
  password?: string;

  @IsOptional()
  @IsString({ message: 'URL avatar phai la chuoi ky tu.' })
  avatarUrl?: string;

  @IsOptional()
  @IsString({ message: 'So dien thoai phai la chuoi ky tu.' })
  phoneNumber?: string;

  @IsOptional()
  @IsString({ message: 'Role phai la kieu chuoi.' })
  @IsIn(['user', 'admin', 'staff', 'manager', 'technician'], {
    message:
      'Role phai la mot trong cac gia tri: user, admin, staff, manager, technician',
  })
  role?: string;
}

export class VerifyEmailDto {
  @IsEmail({}, { message: 'Email khong hop le.' })
  email!: string;

  @IsNotEmpty({ message: 'Ma xac thuc khong duoc de trong.' })
  code!: string;
}
