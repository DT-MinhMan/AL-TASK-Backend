import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task } from '../../tasks/schemas/task.schema';
import { Project } from '../../projects/schemas/project.schema';
import { Sprint } from '../../sprints/schemas/sprint.schema';
import { Page } from '../../pages/schemas/page.schema';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectModel(Task.name) private taskModel: Model<Task>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(Sprint.name) private sprintModel: Model<Sprint>,
    @InjectModel(Page.name) private pageModel: Model<Page>,
  ) {}

  async getWorkspaceOverview(workspaceId: string, userId: string) {
    this.logger.log(`Getting workspace overview for workspaceId: ${workspaceId}, userId: ${userId}`);

    const workspaceObjectId = new Types.ObjectId(workspaceId);

    // Get total projects
    const totalProjects = await this.projectModel.countDocuments({
      workspaceId: workspaceObjectId,
    });

    // Get all projects in workspace to calculate task counts
    const projects = await this.projectModel.find(
      { workspaceId: workspaceObjectId },
      { _id: 1 },
    );
    const projectIds = projects.map((p) => p._id);

    // Get total tasks across all projects
    const totalTasks = await this.taskModel.countDocuments({
      projectId: { $in: projectIds },
    });

    // Tasks by status
    const tasksByStatus = await this.taskModel.aggregate([
      { $match: { projectId: { $in: projectIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Tasks by type
    const tasksByType = await this.taskModel.aggregate([
      { $match: { projectId: { $in: projectIds } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    // Tasks by priority
    const tasksByPriority = await this.taskModel.aggregate([
      { $match: { projectId: { $in: projectIds } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    // Recent tasks
    const recentTasks = await this.taskModel
      .find({ projectId: { $in: projectIds } })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title key status type createdAt')
      .exec();

    // My tasks (assigned to current user)
    const myTasks = await this.taskModel
      .find({
        projectId: { $in: projectIds },
        assigneeId: new Types.ObjectId(userId),
      })
      .select('title key status type priority projectId createdAt')
      .exec();

    // Active sprints
    const activeSprints = await this.sprintModel.countDocuments({
      workspaceId: workspaceObjectId,
      status: 'active',
    });

    return {
      totalProjects,
      totalTasks,
      tasksByStatus,
      tasksByType,
      tasksByPriority,
      recentTasks,
      myTasks,
      activeSprints,
    };
  }

  async getProjectStats(projectId: string) {
    this.logger.log(`Getting project stats for projectId: ${projectId}`);

    const projectObjectId = new Types.ObjectId(projectId);

    const totalTasks = await this.taskModel.countDocuments({
      projectId: projectObjectId,
    });

    const completedTasks = await this.taskModel.countDocuments({
      projectId: projectObjectId,
      status: 'done',
    });

    const inProgressTasks = await this.taskModel.countDocuments({
      projectId: projectObjectId,
      status: 'in_progress',
    });

    const todoTasks = await this.taskModel.countDocuments({
      projectId: projectObjectId,
      status: 'todo',
    });

    const tasksByStatus = await this.taskModel.aggregate([
      { $match: { projectId: projectObjectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const tasksByType = await this.taskModel.aggregate([
      { $match: { projectId: projectObjectId } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const tasksByPriority = await this.taskModel.aggregate([
      { $match: { projectId: projectObjectId } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    const tasksByAssignee = await this.taskModel.aggregate([
      { $match: { projectId: projectObjectId, assigneeId: { $ne: null } } },
      {
        $group: {
          _id: '$assigneeId',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          count: 1,
          user: {
            _id: '$user._id',
            name: '$user.name',
            email: '$user.email',
            avatarUrl: '$user.avatarUrl',
          },
        },
      },
    ]);

    // Sprint progress
    const activeSprint = await this.sprintModel.findOne({
      projectId: projectObjectId,
      status: 'active',
    });

    let sprintProgress: any = null;
    if (activeSprint) {
      const sprintTasks = await this.taskModel
        .find({
          projectId: projectObjectId,
          sprintId: activeSprint._id,
        })
        .select('storyPoints status')
        .exec();

      const totalPoints = sprintTasks.reduce(
        (sum, task) => sum + (task.storyPoints || 0),
        0,
      );
      const completedPoints = sprintTasks
        .filter((task) => task.status === 'done')
        .reduce((sum, task) => sum + (task.storyPoints || 0), 0);

      sprintProgress = {
        sprintId: activeSprint._id.toString(),
        sprintName: activeSprint.name,
        totalStoryPoints: totalPoints,
        completedStoryPoints: completedPoints,
        completionPercentage:
          totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
      };
    }

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      tasksByStatus,
      tasksByType,
      tasksByPriority,
      tasksByAssignee,
      sprintProgress,
    };
  }

  async getUserStats(userId: string) {
    this.logger.log(`Getting user stats for userId: ${userId}`);

    const userObjectId = new Types.ObjectId(userId);

    const tasksAssigned = await this.taskModel.countDocuments({
      assigneeId: userObjectId,
    });

    const tasksByStatus = await this.taskModel.aggregate([
      { $match: { assigneeId: userObjectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const tasksByPriority = await this.taskModel.aggregate([
      { $match: { assigneeId: userObjectId } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    const recentlyCompleted = await this.taskModel
      .find({
        assigneeId: userObjectId,
        status: 'done',
      })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('title key type priority projectId completedAt')
      .populate('projectId', 'name key')
      .exec();

    const recentActivity = await this.taskModel
      .find({
        $or: [{ createdBy: userObjectId }, { updatedBy: userObjectId }],
      })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select('title key status type priority projectId createdAt updatedAt createdBy updatedBy')
      .exec();

    return {
      tasksAssigned,
      tasksByStatus,
      tasksByPriority,
      recentlyCompleted,
      recentActivity,
    };
  }

  async getSprintProgress(sprintId: string) {
    this.logger.log(`Getting sprint progress for sprintId: ${sprintId}`);

    const sprintObjectId = new Types.ObjectId(sprintId);
    const sprint = await this.sprintModel.findById(sprintObjectId);

    if (!sprint) {
      return null;
    }

    const tasks = await this.taskModel
      .find({ sprintId: sprintObjectId })
      .select('title key status type priority storyPoints assigneeId')
      .populate('assigneeId', 'name email avatarUrl')
      .exec();

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'done').length;
    const totalStoryPoints = tasks.reduce(
      (sum, task) => sum + (task.storyPoints || 0),
      0,
    );
    const completedStoryPoints = tasks
      .filter((task) => task.status === 'done')
      .reduce((sum, task) => sum + (task.storyPoints || 0), 0);

    const tasksByStatus = await this.taskModel.aggregate([
      { $match: { sprintId: sprintObjectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return {
      sprint: {
        _id: sprint._id,
        name: sprint.name,
        status: sprint.status,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
      },
      totalTasks,
      completedTasks,
      totalStoryPoints,
      completedStoryPoints,
      completionPercentage:
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      storyPointsCompletionPercentage:
        totalStoryPoints > 0
          ? Math.round((completedStoryPoints / totalStoryPoints) * 100)
          : 0,
      tasksByStatus,
      tasks: tasks.map((task) => ({
        _id: task._id,
        title: task.title,
        key: task.key,
        status: task.status,
        type: task.type,
        priority: task.priority,
        storyPoints: task.storyPoints,
        assignee: task.assigneeId,
      })),
    };
  }
}
