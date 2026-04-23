import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, PostDocument } from '../schemas/post.schema';
import { CreatePostDto } from '../dtos/create-post.dto';
import { UpdatePostDto } from '../dtos/update-post.dto';
import { FilterPostDto } from '../dtos/filter-post.dto';
import { PostsRepository } from '../repositories/posts.repository';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    private readonly postsRepository: PostsRepository,
  ) {}

  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const baseSlug = this.slugify(title);
    let slug = baseSlug;
    let counter = 1;

    while (await this.postsRepository.findBySlugWithSlugify(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;

      if (counter > 100) {
        throw new ConflictException('Unable to generate unique slug for post');
      }
    }

    return slug;
  }

  async create(dto: CreatePostDto, userId?: string): Promise<Post> {
    this.logger.log(`Creating post: ${dto.title}`);

    const slug = await this.generateUniqueSlug(dto.title);

    const postData: any = {
      ...dto,
      slug,
    };

    if (userId && Types.ObjectId.isValid(userId)) {
      postData.authorId = new Types.ObjectId(userId);
    } else if (dto.authorId && Types.ObjectId.isValid(dto.authorId)) {
      postData.authorId = new Types.ObjectId(dto.authorId);
    } else {
      throw new BadRequestException('Author ID is required');
    }

    if (dto.tags && dto.tags.length > 0) {
      postData.tags = dto.tags;
    }

    if (dto.scheduledAt) {
      postData.scheduledAt = new Date(dto.scheduledAt);
    }

    const post = await this.postsRepository.create(postData);
    this.logger.log(`Post created with id: ${post._id}`);
    return post;
  }

  async findById(id: string): Promise<Post> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postsRepository.findById(id);
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    return post;
  }

  async findBySlug(slug: string): Promise<Post> {
    const post = await this.postsRepository.findBySlug(slug);
    if (!post) {
      throw new NotFoundException(`Post with slug '${slug}' not found`);
    }
    return post;
  }

  async findAll(filter: FilterPostDto): Promise<{ data: Post[]; total: number; page: number; limit: number }> {
    return this.postsRepository.findAll(filter);
  }

  async findByAuthor(authorId: string): Promise<Post[]> {
    if (!Types.ObjectId.isValid(authorId)) {
      throw new BadRequestException('Invalid author ID');
    }
    return this.postsRepository.findByAuthor(authorId);
  }

  async findByCategory(categoryId: string): Promise<Post[]> {
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new BadRequestException('Invalid category ID');
    }
    return this.postsRepository.findByCategory(categoryId);
  }

  async findFeatured(limit: number = 10): Promise<Post[]> {
    return this.postsRepository.findFeatured(limit);
  }

  async findPending(): Promise<Post[]> {
    return this.postsRepository.findPending();
  }

  async update(id: string, dto: UpdatePostDto): Promise<Post> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }

    const updateData: any = { ...dto };

    if (dto.categoryId && Types.ObjectId.isValid(dto.categoryId)) {
      updateData.categoryId = new Types.ObjectId(dto.categoryId);
    }

    if (dto.scheduledAt) {
      updateData.scheduledAt = new Date(dto.scheduledAt);
    }

    const post = await this.postsRepository.update(id, updateData);
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    this.logger.log(`Post ${id} updated`);
    return post;
  }

  async delete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }

    const deleted = await this.postsRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    this.logger.log(`Post ${id} deleted`);
  }

  async approve(id: string): Promise<Post> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postsRepository.approve(id);
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    this.logger.log(`Post ${id} approved`);
    return post;
  }

  async reject(id: string): Promise<Post> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postsRepository.reject(id);
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    this.logger.log(`Post ${id} rejected`);
    return post;
  }

  async incrementViewCount(id: string): Promise<Post> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postsRepository.incrementViewCount(id);
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return post;
  }

  async search(query: string, limit: number = 20): Promise<Post[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    try {
      return await this.postsRepository.search(query.trim(), limit);
    } catch (error) {
      const err = error as Error;
      this.logger.warn(`Text search failed, falling back to regex: ${err.message}`);
      const regexFilter: FilterPostDto = {
        search: query,
        status: 'published',
        page: 1,
        limit,
      };
      const result = await this.postsRepository.findAll(regexFilter);
      return result.data;
    }
  }
}
