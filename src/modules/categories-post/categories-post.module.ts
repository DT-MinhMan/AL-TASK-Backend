import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoryPost, CategoryPostSchema } from './schemas/categories-post.schema';
import { CategoriesPostService } from './services/categories-post.service';
import { CategoriesPostController } from './controllers/categories-post.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CategoryPost.name, schema: CategoryPostSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [CategoriesPostController],
  providers: [CategoriesPostService, JwtAuthGuard],
  exports: [CategoriesPostService, JwtAuthGuard],
})
export class CategoriesPostModule {}
