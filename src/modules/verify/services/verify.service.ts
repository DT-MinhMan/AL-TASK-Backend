import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MailerService } from '@nestjs-modules/mailer';
import { Verify, VerifyDocument } from '../schemas/verify.schema';
import { VerifyType } from '../dtos/verify.dto';

@Injectable()
export class VerifyService {
  constructor(
    @InjectModel(Verify.name) private verifyModel: Model<VerifyDocument>,
    private readonly mailerService: MailerService,
  ) {}

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async generateVerificationCode(email: string): Promise<string> {
    const code = this.generateCode();

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.verifyModel.create({
      email,
      code,
      type: VerifyType.VERIFICATION,
      isUsed: false,
      expiresAt,
    });

    return code;
  }

  async verifyCode(
    email: string,
    code: string,
    type: VerifyType,
  ): Promise<{ valid: boolean; message: string }> {
    const verification = await this.verifyModel.findOne({
      email,
      code,
      type,
      isUsed: false,
    });

    if (!verification) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    const now = new Date();
    if (verification.expiresAt < now) {
      throw new BadRequestException('Verification code has expired');
    }

    verification.isUsed = true;
    await verification.save();

    return {
      valid: true,
      message: 'Verification successful',
    };
  }

  async sendVerificationEmail(email: string): Promise<void> {
    const code = await this.generateVerificationCode(email);

    await this.mailerService.sendMail({
      to: email,
      subject: 'Xác thực email - Mã xác minh',
      template: './modules/verify/templates/verification',
      context: { code },
    });
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    otp: string,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await this.verifyModel.create({
      email,
      code: otp,
      type: VerifyType.PASSWORD_RESET,
      isUsed: false,
      expiresAt,
    });

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Đặt lại mật khẩu - OTP',
      template: './modules/verify/templates/password-reset',
      context: { otp, resetLink },
    });
  }

  async verifyPasswordResetCode(
    email: string,
    otp: string,
  ): Promise<{ valid: boolean; message: string }> {
    return this.verifyCode(email, otp, VerifyType.PASSWORD_RESET);
  }

  async findByEmail(email: string): Promise<VerifyDocument[]> {
    return this.verifyModel.find({ email }).exec();
  }

  async markAsUsed(email: string, code: string): Promise<void> {
    await this.verifyModel.updateOne(
      { email, code },
      { isUsed: true },
    );
  }

  async cleanupExpiredCodes(): Promise<number> {
    const result = await this.verifyModel.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    return result.deletedCount;
  }
}
