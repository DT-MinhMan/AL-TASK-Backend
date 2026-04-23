// 📁 src/modules/auth/schemas/auth.schema.ts

import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * 🛠️ **Schema cho Bảng Auth trong MongoDB**
 */
@Schema({ timestamps: true })
export class Auth extends Document {
  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true })
  password!: string;

  /**
   * 🆕 **Role được lưu dưới dạng chuỗi**
   * Các giá trị hợp lệ: `"user"`, `"admin"`, `"staff"`, `"manager"`, `"technician"`
   * Role mặc định là `"user"`
   */
  @Prop({
    type: String,
    enum: ['user', 'admin', 'staff', 'manager', 'technician'],
    default: 'user',
  })
  role!: string;

  /**
   * 🆕 **RoleId tham chiếu đến Role tùy chỉnh**
   * Khi có roleId, điều này sẽ được ưu tiên thay vì sử dụng trường role chuẩn
   */
  @Prop({ type: Types.ObjectId, ref: 'Role' })
  roleId?: Types.ObjectId;

  /**
   * **Trạng thái người dùng**
   * Các giá trị mặc định: `"active"`, `"inactive"`, `"banned"`
   */
  @Prop({ type: String, default: 'active' })
  status!: string;

  @Prop()
  fullName?: string;

  @Prop()
  avatarUrl?: string;

  @Prop()
  phoneNumber?: string;
}

/**
 * 🔨 **Tạo Schema từ Class Auth**
 */
export const AuthSchema = SchemaFactory.createForClass(Auth);
