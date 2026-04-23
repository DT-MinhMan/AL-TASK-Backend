import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleController } from './controllers/role.controller';
import { UserRoleController } from './controllers/user-role.controller';
import { RoleService } from './services/role.service';
import { Role, RoleSchema } from './schemas/role.schema';
import { RolePermission, RolePermissionSchema } from './schemas/role-permission.schema';
import { AuthModule } from '../auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PermissionsModule } from '../permissions/permissions.module';
import { Permission, PermissionSchema } from '../permissions/schemas/permission.schema';
import { CommonModule } from '../../common/common.module';
import { User, UserSchema } from '../users/schemas/users.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: RolePermission.name, schema: RolePermissionSchema },
      { name: Permission.name, schema: PermissionSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => AuthModule),
    forwardRef(() => PermissionsModule),
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
  controllers: [RoleController, UserRoleController],
  providers: [
    RoleService,
    ConfigService,
  ],
  exports: [
    RoleService,
    MongooseModule,
    JwtModule
  ],
})
export class ManagerPermissionsModule { }