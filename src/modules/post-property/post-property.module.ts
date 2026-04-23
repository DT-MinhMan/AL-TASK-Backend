import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PostPropertyController } from './controllers/post-property.controller';
import { PostPropertyService } from './services/post-property.service';
import { PropertyPost, PropertyPostSchema } from './schemas/property-post.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PropertyPost.name, schema: PropertyPostSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [PostPropertyController],
  providers: [PostPropertyService, JwtAuthGuard],
  exports: [PostPropertyService, JwtAuthGuard],
})
export class PostPropertyModule {}
