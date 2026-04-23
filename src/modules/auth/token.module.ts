// src/modules/auth/token.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TokenService } from './services/token.service';
import { Token, TokenSchema } from './schemas/token.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Token.name, schema: TokenSchema }]), // Đăng ký Mongoose model cho Token
  ],
  providers: [TokenService],
  exports: [
    TokenService,
    MongooseModule, // 🛠️ Export MongooseModule để sử dụng TokenModel trong AuthModule
  ],
})
export class TokenModule {}
