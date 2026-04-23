// 📁 src/modules/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email!: string;

  @Prop()
  password?: string; // 👈 Không bắt buộc nếu đăng nhập bằng Google

  @Prop()
  googleId?: string; // 👈 Thêm Google ID (tùy chọn)

  @Prop({ default: 'user' })
  role!: string; // Các role: 'user', 'admin', 'staff', 'manager', 'technical'

  @Prop({ type: Types.ObjectId, ref: 'Role' })
  roleId?: Types.ObjectId; // 👈 ID của vai trò tùy chỉnh

  @Prop({ default: 'active' })
  status!: string; // Trạng thái người dùng: 'active', 'offline', 'banned'

  @Prop()
  fullName?: string; // Tên đầy đủ (tùy chọn)

  @Prop()
  avatar?: string; // URL avatar (tùy chọn)

  @Prop()
  phone?: string; // Số điện thoại (tùy chọn)

  @Prop()
  address?: string; // Địa chỉ (tùy chọn)

  @Prop()
  birthday?: string; // Ngày sinh (tùy chọn)

  @Prop()
  gender?: string; // Giới tính (tùy chọn)

  readonly _id!: Types.ObjectId;
  readonly createdAt!: Date;
  readonly updatedAt!: Date;

  // ✅ Getter để chuyển đổi _id thành id (chuỗi)
  get id(): string {
    return this._id.toString();
  }
}

// Tạo schema cho User
export const UserSchema = SchemaFactory.createForClass(User);

// ✅ Tự động ánh xạ _id thành id trong phản hồi JSON
UserSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.password; // 👈 Ẩn mật khẩu trong phản hồi JSON
  },
});
