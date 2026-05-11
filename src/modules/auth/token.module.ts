// src/modules/auth/token.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TokenService } from './services/token.service';
import { Token, TokenSchema } from './schemas/token.schema';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Token.name, schema: TokenSchema }]), // Đăng ký Mongoose model cho Token
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '1d',
        },
      }),
    }),
    ConfigModule,
  ],
  providers: [TokenService],
  exports: [
    TokenService,
    MongooseModule, // 🛠️ Export MongooseModule để sử dụng TokenModel trong AuthModule
  ],
})
export class TokenModule {}
