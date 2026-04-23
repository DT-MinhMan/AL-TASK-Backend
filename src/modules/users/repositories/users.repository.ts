import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/users.schema';

@Injectable()
export class UsersRepository {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async create(userData: Partial<User>): Promise<User> {
    const newUser = new this.userModel(userData);
    return newUser.save();
  }

  async update(
    userId: string,
    updateData: Partial<User> | { $unset: { [key: string]: any } },
  ): Promise<User | null> {
    return await this.userModel
      .findByIdAndUpdate(userId, updateData, { new: true })
      .exec();
  }

  // 📢 Thêm hàm `findAll` để trả về tất cả người dùng
  async findAll(): Promise<User[]> {
    return await this.userModel.find().exec();
  }

  // 📢 Thêm hàm `delete` để xóa người dùng
  async delete(userId: string): Promise<User | null> {
    return await this.userModel.findByIdAndDelete(userId).exec();
  }
}
