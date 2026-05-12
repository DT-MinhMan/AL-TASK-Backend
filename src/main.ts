import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';
import { join } from 'path';
import mongoose from 'mongoose';

async function bootstrap() {
  console.log('?? �ang kh?i t?o ?ng d?ng NestJS...');

  try {
    console.log('? �ang ch? k?t n?i MongoDB ho�n t?t...');
    await mongoose.connection.asPromise();
    console.log('? K?t n?i MongoDB d� s?n s�ng, kh?i d?ng ?ng d?ng...');

    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Trust reverse proxy (Nginx) — cần thiết cho rate limiting theo IP thực
    app.set('trust proxy', 1);

    //  Hỗ trợ dữ liệu lớn
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    //  Hỗ trợ Cookie Parser (cho HttpOnly Cookie Auth)
    app.use(cookieParser());

    //  Bật CORS cho frontend gửi API với credentials
    app.enableCors({
      origin: process.env.FRONTEND_URL,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      allowedHeaders: 'Content-Type, Authorization',
      credentials: true, // ✅ Cho phép gửi cookies
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.useStaticAssets(join(__dirname, '..', 'uploads'), {
      prefix: '/uploads',
    });

    const PORT = process.env.PORT || 5512;

    await app.listen(PORT);
    console.log(`? Backend dang ch?y t?i: http://localhost:${PORT}`);
  } catch (error) {
    console.error('? L?i kh?i d?ng ?ng d?ng:', error);
    process.exit(1);
  }
}

bootstrap();
