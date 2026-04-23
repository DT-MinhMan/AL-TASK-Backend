import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import { join } from 'path';
import mongoose from 'mongoose';

async function bootstrap() {
  console.log('?? �ang kh?i t?o ?ng d?ng NestJS...');

  try {
    console.log('? �ang ch? k?t n?i MongoDB ho�n t?t...');
    await mongoose.connection.asPromise();
    console.log('? K?t n?i MongoDB d� s?n s�ng, kh?i d?ng ?ng d?ng...');

    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // ? H? tr? d? li?u l?n
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // ? B?t CORS cho frontend g?i API
    app.enableCors({
      origin: process.env.FRONTEND_URL,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      allowedHeaders: 'Content-Type, Authorization',
      credentials: true,
    });

    // ? D�ng ValidationPipe d? ki?m tra d? li?u d?u v�o
    app.useGlobalPipes(new ValidationPipe());

    // ? Cho ph�p truy c?p t?p tinh trong thu m?c `uploads/`
    app.useStaticAssets(join(__dirname, '..', 'uploads'), {
      prefix: '/uploads',
    });

    const PORT = process.env.PORT || 5512;

    // ? Ch?y server ? d?ng HTTP � SSL s? do Nginx x? l�
    await app.listen(PORT);
    console.log(`? Backend dang ch?y t?i: http://localhost:${PORT}`);
  } catch (error) {
    console.error('? L?i kh?i d?ng ?ng d?ng:', error.message);
    process.exit(1);
  }
}

bootstrap();
