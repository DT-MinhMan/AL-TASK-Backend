import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { Otp, OtpDocument } from '../schemas/otp.schema';

@Injectable()
export class OtpService {
  constructor(
    @InjectModel(Otp.name) private readonly otpModel: Model<OtpDocument>,
  ) {}

  /** SEC-5: OTP cryptographically secure */
  generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  /** SEC-6: Hash OTP before persist */
  async hashOtp(otp: string): Promise<string> {
    return bcrypt.hash(otp, 10);
  }

  async createOtp(email: string, otpPlaintext: string, ttlMs: number): Promise<void> {
    const hashedOtp = await this.hashOtp(otpPlaintext);
    await this.otpModel.create({
      email,
      code: hashedOtp,
      expiresAt: new Date(Date.now() + ttlMs),
      isUsed: false,
    });
  }

  /** latest unused + unexpired */
  async getLatestActiveOtp(email: string): Promise<OtpDocument | null> {
    return this.otpModel
      .findOne({ email, isUsed: false, expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .exec();
  }

  async verifyOtp(email: string, otpPlaintext: string): Promise<void> {
    const otpRecord = await this.getLatestActiveOtp(email);
    const isValid = otpRecord && (await bcrypt.compare(otpPlaintext, otpRecord.code));
    if (!isValid) {
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
    }
  }

  async markUsed(otpId: string): Promise<void> {
    await this.otpModel.updateOne({ _id: otpId }, { isUsed: true });
  }

  async invalidateOtp(email: string): Promise<void> {
    await this.otpModel.updateMany({ email, isUsed: false }, { isUsed: true });
  }
}
