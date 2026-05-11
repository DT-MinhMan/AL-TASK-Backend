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

    // ✅ Hỗ trợ dữ liệu lớn
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // ✅ Hỗ trợ Cookie Parser (cho HttpOnly Cookie Auth)
    app.use(cookieParser());

    // ✅ Bật CORS cho frontend gửi API với credentials
    app.enableCors({
      origin: process.env.FRONTEND_URL,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      allowedHeaders: 'Content-Type, Authorization',
      credentials: true, // ✅ Cho phép gửi cookies
    });

    // ? D�ng ValidationPipe d? ki?m tra d? li?u d?u v�o
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // ? Cho ph�p truy c?p t?p tinh trong thu m?c `uploads/`
    app.useStaticAssets(join(__dirname, '..', 'uploads'), {
      prefix: '/uploads',
    });

    const PORT = process.env.PORT || 5512;

    // ? Ch?y server ? d?ng HTTP � SSL s? do Nginx x? l�
    await app.listen(PORT);
    console.log(`? Backend dang ch?y t?i: http://localhost:${PORT}`);
  } catch (error) {
    console.error('? L?i kh?i d?ng ?ng d?ng:', error);
    process.exit(1);
  }
}

bootstrap();
