import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TasksService } from '../services/tasks.service';
import { CreateTaskDto, UpdateTaskDto, FilterTaskDto } from '../dtos/create-task.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tasks with filters' })
  async findAll(@Query() filterDto: FilterTaskDto) {
    return this.tasksService.findAll(filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  async findById(@Param('id') id: string) {
    return this.tasksService.findById(id);
  }

  @Get('key/:key')
  @ApiOperation({ summary: 'Get task by key (e.g., PROJ-1)' })
  async findByKey(@Param('key') key: string) {
    return this.tasksService.findByKey(key);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  async create(@Body() createTaskDto: CreateTaskDto, @Request() req: any) {
    return this.tasksService.create(createTaskDto, req.user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a task' })
  async update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  async delete(@Param('id') id: string) {
    return this.tasksService.delete(id);
  }

  @Put(':id/move')
  @ApiOperation({ summary: 'Move task to a different board/column' })
  @ApiQuery({ name: 'boardId', required: true })
  @ApiQuery({ name: 'columnId', required: true })
  async moveToBoard(
    @Param('id') id: string,
    @Body('boardId') boardId: string,
    @Body('columnId') columnId: string,
  ) {
    return this.tasksService.moveToBoard(id, boardId, columnId);
  }

  @Put(':id/assign')
  @ApiOperation({ summary: 'Assign task to a user' })
  async assignTo(@Param('id') id: string, @Body('userId') userId: string) {
    return this.tasksService.assignTo(id, userId);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Change task status' })
  async changeStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.tasksService.changeStatus(id, status);
  }

  @Put(':id/labels')
  @ApiOperation({ summary: 'Update task labels' })
  async updateLabels(@Param('id') id: string, @Body('labels') labels: string[]) {
    const task = await this.tasksService.findById(id);
    
    for (const label of labels) {
      if (!task.labels.includes(label)) {
        await this.tasksService.addLabel(id, label);
      }
    }

    for (const existingLabel of task.labels) {
      if (!labels.includes(existingLabel)) {
        await this.tasksService.removeLabel(id, existingLabel);
      }
    }

    return this.tasksService.findById(id);
  }

  @Put(':id/attachments')
  @ApiOperation({ summary: 'Add attachment to task' })
  async addAttachment(
    @Param('id') id: string,
    @Body('attachment') attachment: any,
  ) {
    return this.tasksService.addAttachment(id, attachment);
  }

  @Delete(':id/attachments/:attachmentId')
  @ApiOperation({ summary: 'Remove attachment from task' })
  async removeAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.tasksService.removeAttachment(id, attachmentId);
  }

  @Get('workspace/:workspaceId')
  @ApiOperation({ summary: 'Get all tasks for a workspace' })
  async findByWorkspace(@Param('workspaceId') workspaceId: string) {
    return this.tasksService.findByWorkspace(workspaceId);
  }

  @Get('sprint/:sprintId')
  @ApiOperation({ summary: 'Get all tasks for a sprint' })
  async findBySprint(@Param('sprintId') sprintId: string) {
    return this.tasksService.findBySprint(sprintId);
  }

  @Get('board/:boardId')
  @ApiOperation({ summary: 'Get all tasks for a board grouped by column' })
  async findByBoard(@Param('boardId') boardId: string) {
    return this.tasksService.findByBoard(boardId);
  }

  @Get('assignee/:userId')
  @ApiOperation({ summary: 'Get all tasks assigned to a user' })
  async findByAssignee(@Param('userId') userId: string) {
    return this.tasksService.findByAssignee(userId);
  }
}
