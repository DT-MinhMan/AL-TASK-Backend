import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PropertyPost, PropertyPostDocument } from '../schemas/property-post.schema';
import { CreatePropertyPostDto } from '../dtos/create-property-post.dto';
import { UpdatePropertyPostDto } from '../dtos/update-property-post.dto';
import { FilterPropertyPostDto } from '../dtos/filter-property-post.dto';

@Injectable()
export class PostPropertyService {
  constructor(
    @InjectModel(PropertyPost.name) private propertyPostModel: Model<PropertyPostDocument>,
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

    while (await this.propertyPostModel.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  async create(createDto: CreatePropertyPostDto, authorId: string): Promise<PropertyPostDocument> {
    const slug = await this.generateUniqueSlug(createDto.title);

    const propertyPost = new this.propertyPostModel({
      ...createDto,
      slug,
      authorId: new Types.ObjectId(authorId),
      categoryId: createDto.categoryId ? new Types.ObjectId(createDto.categoryId) : undefined,
      amenities: createDto.amenities?.map((id) => new Types.ObjectId(id)) || [],
    });

    return propertyPost.save();
  }

  async findById(id: string): Promise<PropertyPostDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Property post not found');
    }

    const propertyPost = await this.propertyPostModel.findById(id).exec();

    if (!propertyPost) {
      throw new NotFoundException('Property post not found');
    }

    return propertyPost;
  }

  async findBySlug(slug: string): Promise<PropertyPostDocument> {
    const propertyPost = await this.propertyPostModel.findOne({ slug }).exec();

    if (!propertyPost) {
      throw new NotFoundException('Property post not found');
    }

    return propertyPost;
  }

  async findAll(filterDto: FilterPropertyPostDto): Promise<{
    data: PropertyPostDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      authorId,
      categoryId,
      propertyType,
      listingType,
      minPrice,
      maxPrice,
      city,
      district,
      propertyStatus,
      search,
      page = 1,
      limit = 20,
    } = filterDto;

    const query: Record<string, unknown> = {};

    if (authorId) {
      query.authorId = new Types.ObjectId(authorId);
    }

    if (categoryId) {
      query.categoryId = new Types.ObjectId(categoryId);
    }

    if (propertyType) {
      query.propertyType = propertyType;
    }

    if (listingType) {
      query.listingType = listingType;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) {
        (query.price as Record<string, number>).$gte = minPrice;
      }
      if (maxPrice !== undefined) {
        (query.price as Record<string, number>).$lte = maxPrice;
      }
    }

    if (city) {
      query['location.city'] = city;
    }

    if (district) {
      query['location.district'] = district;
    }

    if (propertyStatus) {
      query.propertyStatus = propertyStatus;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;
    const total = await this.propertyPostModel.countDocuments(query).exec();
    const data = await this.propertyPostModel
      .find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByAuthor(authorId: string, page = 1, limit = 20): Promise<{
    data: PropertyPostDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query = { authorId: new Types.ObjectId(authorId) };
    const skip = (page - 1) * limit;
    const total = await this.propertyPostModel.countDocuments(query).exec();
    const data = await this.propertyPostModel
      .find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findApproved(page = 1, limit = 20): Promise<{
    data: PropertyPostDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query = { status: 'approved', visibility: 'public' };
    const skip = (page - 1) * limit;
    const total = await this.propertyPostModel.countDocuments(query).exec();
    const data = await this.propertyPostModel
      .find(query)
      .skip(skip)
      .limit(limit)
      .sort({ publishedAt: -1, createdAt: -1 })
      .exec();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findPending(page = 1, limit = 20): Promise<{
    data: PropertyPostDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query = { status: 'pending' };
    const skip = (page - 1) * limit;
    const total = await this.propertyPostModel.countDocuments(query).exec();
    const data = await this.propertyPostModel
      .find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, updateDto: UpdatePropertyPostDto): Promise<PropertyPostDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Property post not found');
    }

    const updateData: Record<string, unknown> = { ...updateDto };

    if (updateDto.categoryId) {
      updateData.categoryId = new Types.ObjectId(updateDto.categoryId);
    }

    if (updateDto.amenities) {
      updateData.amenities = updateDto.amenities.map((id) => new Types.ObjectId(id));
    }

    const propertyPost = await this.propertyPostModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!propertyPost) {
      throw new NotFoundException('Property post not found');
    }

    return propertyPost;
  }

  async delete(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Property post not found');
    }

    const result = await this.propertyPostModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException('Property post not found');
    }

    return true;
  }

  async approve(id: string): Promise<PropertyPostDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Property post not found');
    }

    const propertyPost = await this.propertyPostModel
      .findByIdAndUpdate(
        id,
        { status: 'approved', publishedAt: new Date() },
        { new: true },
      )
      .exec();

    if (!propertyPost) {
      throw new NotFoundException('Property post not found');
    }

    return propertyPost;
  }

  async reject(id: string): Promise<PropertyPostDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Property post not found');
    }

    const propertyPost = await this.propertyPostModel
      .findByIdAndUpdate(id, { status: 'rejected' }, { new: true })
      .exec();

    if (!propertyPost) {
      throw new NotFoundException('Property post not found');
    }

    return propertyPost;
  }

  async incrementViewCount(id: string): Promise<PropertyPostDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Property post not found');
    }

    const propertyPost = await this.propertyPostModel
      .findByIdAndUpdate(id, { $inc: { viewCount: 1 } }, { new: true })
      .exec();

    if (!propertyPost) {
      throw new NotFoundException('Property post not found');
    }

    return propertyPost;
  }

  async search(keyword: string, page = 1, limit = 20): Promise<{
    data: PropertyPostDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query = {
      $or: [
        { title: { $regex: keyword, $options: 'i' } },
        { content: { $regex: keyword, $options: 'i' } },
      ],
      status: 'approved',
      visibility: 'public',
    };

    const skip = (page - 1) * limit;
    const total = await this.propertyPostModel.countDocuments(query).exec();
    const data = await this.propertyPostModel
      .find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
