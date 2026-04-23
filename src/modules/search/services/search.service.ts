import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task } from '../../tasks/schemas/task.schema';
import { Project } from '../../projects/schemas/project.schema';
import { Page } from '../../pages/schemas/page.schema';

export interface SearchOptions {
  types?: ('task' | 'project' | 'page')[];
  workspaceId?: string;
  limit?: number;
}

export interface SearchResult {
  tasks: any[];
  projects: any[];
  pages: any[];
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectModel(Task.name) private taskModel: Model<Task>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(Page.name) private pageModel: Model<Page>,
  ) {}

  async search(query: string, userId: string, options?: SearchOptions): Promise<SearchResult> {
    this.logger.log(`Searching for "${query}" with options: ${JSON.stringify(options)}`);

    const types = options?.types || ['task', 'project', 'page'];
    const limit = options?.limit || 20;

    const result: SearchResult = {
      tasks: [],
      projects: [],
      pages: [],
    };

    if (types.includes('task')) {
      result.tasks = await this.searchTasks(query, undefined);
    }

    if (types.includes('project')) {
      result.projects = await this.searchProjects(query, options?.workspaceId);
    }

    if (types.includes('page')) {
      result.pages = await this.searchPages(query, undefined);
    }

    return result;
  }

  async searchTasks(query: string, projectId?: string): Promise<any[]> {
    this.logger.log(`Searching tasks for query: "${query}", projectId: ${projectId}`);

    const searchRegex = { $regex: query, $options: 'i' };
    const matchQuery: any = {
      $or: [
        { title: searchRegex },
        { description: searchRegex },
        { key: searchRegex },
      ],
    };

    if (projectId) {
      matchQuery.projectId = new Types.ObjectId(projectId);
    }

    return this.taskModel
      .find(matchQuery)
      .select('_id key title status type priority projectId assigneeId createdAt')
      .limit(20)
      .exec();
  }

  async searchProjects(query: string, workspaceId?: string): Promise<any[]> {
    this.logger.log(`Searching projects for query: "${query}", workspaceId: ${workspaceId}`);

    const searchRegex = { $regex: query, $options: 'i' };
    const matchQuery: any = {
      $or: [
        { name: searchRegex },
        { key: searchRegex },
        { description: searchRegex },
      ],
    };

    if (workspaceId) {
      matchQuery.workspaceId = new Types.ObjectId(workspaceId);
    }

    return this.projectModel
      .find(matchQuery)
      .select('_id name key type status createdAt')
      .limit(20)
      .exec();
  }

  async searchPages(query: string, spaceId?: string): Promise<any[]> {
    this.logger.log(`Searching pages for query: "${query}", spaceId: ${spaceId}`);

    const searchRegex = { $regex: query, $options: 'i' };
    const matchQuery: any = {
      $or: [
        { title: searchRegex },
        { content: searchRegex },
        { slug: searchRegex },
      ],
    };

    if (spaceId) {
      matchQuery.spaceId = new Types.ObjectId(spaceId);
    }

    return this.pageModel
      .find(matchQuery)
      .select('_id title slug spaceId status authorId createdAt')
      .limit(20)
      .exec();
  }
}
