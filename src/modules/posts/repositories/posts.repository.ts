import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, PostDocument } from '../schemas/post.schema';
import { FilterPostDto } from '../dtos/filter-post.dto';

@Injectable()
export class PostsRepository {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  async findById(id: string): Promise<Post | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.postModel.findById(id).populate('authorId', 'fullName email avatar').exec();
  }

  async findBySlug(slug: string): Promise<Post | null> {
    return this.postModel.findOne({ slug }).populate('authorId', 'fullName email avatar').exec();
  }

  async findAll(filter: FilterPostDto): Promise<{ data: Post[]; total: number; page: number; limit: number }> {
    const { authorId, categoryId, status, search, page = 1, limit = 10, sortBy = 'publishedAt', sortOrder = 'desc' } = filter;

    const query: any = {};

    if (authorId && Types.ObjectId.isValid(authorId)) {
      query.authorId = new Types.ObjectId(authorId);
    }

    if (categoryId && Types.ObjectId.isValid(categoryId)) {
      query.categoryId = new Types.ObjectId(categoryId);
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
      ];
    }

    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortBy]: sortDirection };

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.postModel.find(query)
        .populate('authorId', 'fullName email avatar')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.postModel.countDocuments(query).exec(),
    ]);

    return { data, total, page, limit };
  }

  async findByAuthor(authorId: string): Promise<Post[]> {
    if (!Types.ObjectId.isValid(authorId)) {
      return [];
    }
    return this.postModel.find({ authorId: new Types.ObjectId(authorId) })
      .sort({ publishedAt: -1 })
      .exec();
  }

  async findByCategory(categoryId: string): Promise<Post[]> {
    if (!Types.ObjectId.isValid(categoryId)) {
      return [];
    }
    return this.postModel.find({ categoryId: new Types.ObjectId(categoryId), status: 'published' })
      .sort({ publishedAt: -1 })
      .exec();
  }

  async findFeatured(limit: number = 10): Promise<Post[]> {
    return this.postModel.find({ status: 'published', featured: true })
      .populate('authorId', 'fullName email avatar')
      .sort({ publishedAt: -1 })
      .limit(limit)
      .exec();
  }

  async findPending(): Promise<Post[]> {
    return this.postModel.find({ status: 'pending' })
      .populate('authorId', 'fullName email avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  async create(postData: Partial<Post>): Promise<Post> {
    const newPost = new this.postModel(postData);
    return newPost.save();
  }

  async update(id: string, updateData: Partial<Post>): Promise<Post | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.postModel.findByIdAndUpdate(id, updateData, { new: true })
      .populate('authorId', 'fullName email avatar')
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      return false;
    }
    const result = await this.postModel.deleteOne({ _id: new Types.ObjectId(id) }).exec();
    return result.deletedCount > 0;
  }

  async approve(id: string): Promise<Post | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.postModel.findByIdAndUpdate(
      id,
      { status: 'published', publishedAt: new Date() },
      { new: true }
    ).populate('authorId', 'fullName email avatar').exec();
  }

  async reject(id: string): Promise<Post | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.postModel.findByIdAndUpdate(
      id,
      { status: 'rejected' },
      { new: true }
    ).populate('authorId', 'fullName email avatar').exec();
  }

  async incrementViewCount(id: string): Promise<Post | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.postModel.findByIdAndUpdate(
      id,
      { $inc: { viewCount: 1 } },
      { new: true }
    ).exec();
  }

  async search(query: string, limit: number = 20): Promise<Post[]> {
    return this.postModel.find({
      $text: { $search: query },
      status: 'published',
    })
      .populate('authorId', 'fullName email avatar')
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .exec();
  }

  async findBySlugWithSlugify(slug: string): Promise<Post | null> {
    return this.postModel.findOne({ slug }).exec();
  }
}
