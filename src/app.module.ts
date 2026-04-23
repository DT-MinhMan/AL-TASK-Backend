import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { join } from 'path';

import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { ManagerPermissionsModule } from './modules/manager-permissions/manager-permissions.module';
import { CommonModule } from './common/common.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';

// Jira + Confluence Modules
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { BoardsModule } from './modules/boards/boards.module';
import { SprintsModule } from './modules/sprints/sprints.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { CommentsModule } from './modules/comments/comments.module';
import { SpacesModule } from './modules/spaces/spaces.module';
import { PagesModule } from './modules/pages/pages.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SearchModule } from './modules/search/search.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';

// Real Estate / Blog Modules
import { PostsModule } from './modules/posts/posts.module';
import { PostPropertyModule } from './modules/post-property/post-property.module';
import { CategoriesPostModule } from './modules/categories-post/categories-post.module';
import { UtilitiesModule } from './modules/utilities/utilities.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { ImagesModule } from './modules/images/images.module';
import { VerifyModule } from './modules/verify/verify.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),

    CommonModule,
    DatabaseModule,

    // Core Auth
    AuthModule,
    UsersModule,
    PermissionsModule,
    ManagerPermissionsModule,

    // Jira Modules
    WorkspacesModule,
    ProjectsModule,
    TasksModule,
    BoardsModule,
    SprintsModule,
    WorkflowsModule,
    CommentsModule,
    AttachmentsModule,

    // Confluence Modules
    SpacesModule,
    PagesModule,

    // System
    NotificationsModule,
    SearchModule,
    DashboardModule,

    // Real Estate / Blog Modules
    PostsModule,
    PostPropertyModule,
    CategoriesPostModule,
    UtilitiesModule,
    AddressesModule,
    ImagesModule,

    // Email
    MailerModule.forRoot({
      transport: {
        host: process.env.MAIL_HOST,
        port: parseInt(process.env.MAIL_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false,
        },
      },
      defaults: {
        from: `"AL-TASK" <${process.env.MAIL_USER}>`,
      },
      template: {
        dir: join(__dirname, '..', 'src', 'modules', 'verify', 'templates'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),

    VerifyModule,
  ],
})
export class AppModule {}
