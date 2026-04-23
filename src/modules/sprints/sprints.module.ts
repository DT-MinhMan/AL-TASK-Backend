import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SprintsController } from './controllers/sprints.controller';
import { SprintsService } from './services/sprints.service';
import { Sprint, SprintSchema } from './schemas/sprint.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Sprint.name, schema: SprintSchema }]),
    forwardRef(() => AuthModule),
  ],
  controllers: [SprintsController],
  providers: [SprintsService, JwtAuthGuard],
  exports: [SprintsService, JwtAuthGuard],
})
export class SprintsModule {}
