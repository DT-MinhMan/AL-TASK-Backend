import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SearchController } from './controllers/search.controller';
import { SearchService } from './services/search.service';
import { Task, TaskSchema } from '../tasks/schemas/task.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { Page, PageSchema } from '../pages/schemas/page.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Page.name, schema: PageSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [SearchController],
  providers: [SearchService, JwtAuthGuard],
  exports: [SearchService],
})
export class SearchModule {}
