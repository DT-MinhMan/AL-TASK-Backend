import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import request = require('supertest');
import { App } from 'supertest/types';

import { USER_ROLES } from '../src/common/constants/user-roles.constants';
import { UserManagementController } from '../src/modules/auth/controllers/user-management.controller';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { TokenService } from '../src/modules/auth/services/token.service';
import { UsersService } from '../src/modules/users/services/users.service';

describe('Auth user-management authorization (e2e)', () => {
  let app: INestApplication<App>;

  const jwtPayloads = {
    'user-token': {
      userId: 'user-1',
      email: 'user@example.com',
      role: USER_ROLES.USER,
      type: 'access',
    },
    'admin-token': {
      userId: 'admin-1',
      email: 'admin@example.com',
      role: USER_ROLES.ADMIN,
      type: 'access',
    },
    'invalid-role-token': {
      userId: 'manager-1',
      email: 'manager@example.com',
      role: USER_ROLES.MANAGER,
      type: 'access',
    },
  } as const;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UserManagementController],
      providers: [
        JwtAuthGuard,
        RolesGuard,
        Reflector,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn((token: keyof typeof jwtPayloads) => {
              const payload = jwtPayloads[token];
              if (!payload) {
                throw new Error('invalid token');
              }
              return payload;
            }),
          },
        },
        {
          provide: TokenService,
          useValue: {
            findActiveAccessToken: jest.fn((token: keyof typeof jwtPayloads) => {
              const payload = jwtPayloads[token];
              return payload ? { userId: { toString: () => payload.userId } } : null;
            }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            getAllUsers: jest.fn().mockResolvedValue([
              {
                _id: { toString: () => 'user-1' },
                email: 'user@example.com',
                role: USER_ROLES.USER,
                status: 'active',
                fullName: 'Regular User',
                avatar: 'avatar.png',
                password: 'hashed-password',
                googleId: 'google-id',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedAt: new Date('2026-01-02T00:00:00.000Z'),
              },
            ]),
            updateUser: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects missing token with 401', async () => {
    await request(app.getHttpServer()).get('/auth/users').expect(401);
  });

  it('rejects regular users with 403', async () => {
    await request(app.getHttpServer())
      .get('/auth/users')
      .set('Cookie', 'access_token=user-token')
      .expect(403);
  });

  it('rejects authenticated users without the admin role with 403', async () => {
    await request(app.getHttpServer())
      .get('/auth/users')
      .set('Cookie', 'access_token=invalid-role-token')
      .expect(403);
  });

  it('allows admins and sanitizes user list responses', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/users')
      .set('Cookie', 'access_token=admin-token')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      id: 'user-1',
      email: 'user@example.com',
      role: USER_ROLES.USER,
      status: 'active',
      fullName: 'Regular User',
      avatar: 'avatar.png',
    });
    expect(response.body[0]).not.toHaveProperty('password');
    expect(response.body[0]).not.toHaveProperty('googleId');
  });
});
