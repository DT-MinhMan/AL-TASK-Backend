import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttachmentsController } from './controllers/attachments.controller';
import { AttachmentsService } from './services/attachments.service';
import { Attachment, AttachmentSchema } from './schemas/attachment.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Attachment.name, schema: AttachmentSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, JwtAuthGuard],
  exports: [AttachmentsService, JwtAuthGuard],
})
export class AttachmentsModule {}
