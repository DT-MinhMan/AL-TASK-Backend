import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Board, BoardSchema } from './schemas/board.schema';
import { BoardsController } from './controllers/boards.controller';
import { BoardsService } from './services/boards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthModule } from '../auth/auth.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Board.name, schema: BoardSchema }]),
    forwardRef(() => WorkspacesModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [BoardsController],
  providers: [BoardsService, JwtAuthGuard],
  exports: [BoardsService, JwtAuthGuard],
})
export class BoardsModule {}
