import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PermissionsController } from './controllers/permissions.controller';
import { PermissionsService } from './services/permissions.service';
import { Permission, PermissionSchema } from './schemas/permission.schema';
import { UserPermission, UserPermissionSchema } from './schemas/user-permission.schema';
import { AuthModule } from '../auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CommonModule } from '../../common/common.module';
import { User, UserSchema } from '../users/schemas/users.schema';
import { RolePermission, RolePermissionSchema } from '../manager-permissions/schemas/role-permission.schema';
import { ManagerPermissionsModule } from '../manager-permissions/manager-permissions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Permission.name, schema: PermissionSchema },
      { name: UserPermission.name, schema: UserPermissionSchema },
      { name: User.name, schema: UserSchema },
      { name: RolePermission.name, schema: RolePermissionSchema },
    ]),
    forwardRef(() => AuthModule),
    forwardRef(() => ManagerPermissionsModule),
    CommonModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '15d',
        },
      }),
    }),
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService, ConfigService],
  exports: [PermissionsService, MongooseModule],
})
export class PermissionsModule { }
