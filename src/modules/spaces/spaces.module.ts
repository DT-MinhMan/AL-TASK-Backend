import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SpacesController } from './controllers/spaces.controller';
import { SpacesService } from './services/spaces.service';
import { Space, SpaceSchema } from './schemas/space.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Space.name, schema: SpaceSchema }]),
    forwardRef(() => AuthModule),
  ],
  controllers: [SpacesController],
  providers: [SpacesService, JwtAuthGuard],
  exports: [SpacesService, JwtAuthGuard],
})
export class SpacesModule {}
