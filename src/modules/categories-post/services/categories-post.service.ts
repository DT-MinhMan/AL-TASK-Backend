import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CategoryPost, CategoryPostDocument } from '../schemas/categories-post.schema';
import { CreateCategoryDto } from '../dtos/create-category.dto';
import { UpdateCategoryDto } from '../dtos/update-category.dto';

@Injectable()
export class CategoriesPostService {
  constructor(
    @InjectModel(CategoryPost.name) private categoryModel: Model<CategoryPostDocument>,
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

  private async computePath(parentId?: string): Promise<{ path: string; level: number }> {
    if (!parentId) {
      return { path: '', level: 0 };
    }
    const parent = await this.categoryModel.findById(parentId);
    if (!parent) {
      return { path: '', level: 0 };
    }
    return {
      path: parent.path ? `${parent.path},${parent._id.toString()}` : parent._id.toString(),
      level: parent.level + 1,
    };
  }

  async create(dto: CreateCategoryDto): Promise<CategoryPostDocument> {
    const baseSlug = this.slugify(dto.name);
    let slug = baseSlug;
    let counter = 1;

    while (await this.categoryModel.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const { path, level } = await this.computePath(dto.parentId);

    const category = new this.categoryModel({
      ...dto,
      slug,
      path,
      level,
    });

    return category.save();
  }

  async findAll(): Promise<CategoryPostDocument[]> {
    return this.categoryModel.find().sort({ order: 1 }).exec();
  }

  async findById(id: string): Promise<CategoryPostDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Category not found');
    }
    const category = await this.categoryModel.findById(id).exec();
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async findBySlug(slug: string): Promise<CategoryPostDocument> {
    const category = await this.categoryModel.findOne({ slug }).exec();
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async findByParent(parentId: string): Promise<CategoryPostDocument[]> {
    return this.categoryModel.find({ parentId }).sort({ order: 1 }).exec();
  }

  async findRootCategories(): Promise<CategoryPostDocument[]> {
    return this.categoryModel.find({ level: 0 }).sort({ order: 1 }).exec();
  }

  async findDescendants(id: string): Promise<CategoryPostDocument[]> {
    const category = await this.findById(id);
    if (!category.path) {
      return this.categoryModel.find({ path: { $regex: `^${category._id.toString()}` } }).exec();
    }
    return this.categoryModel
      .find({ path: { $regex: `^${category.path},${category._id.toString()}` } })
      .exec();
  }

  async findAncestors(id: string): Promise<CategoryPostDocument[]> {
    const category = await this.findById(id);
    if (!category.path) {
      return [];
    }
    const ancestorIds = category.path.split(',');
    return this.categoryModel.find({ _id: { $in: ancestorIds } }).exec();
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryPostDocument> {
    const category = await this.findById(id);

    if (dto.parentId !== undefined && dto.parentId !== category.parentId?.toString()) {
      const { path, level } = await this.computePath(dto.parentId || undefined);
      (dto as any).path = path;
      (dto as any).level = level;
    }

    Object.assign(category, dto);
    return category.save();
  }

  async delete(id: string, reparentChildren = true): Promise<void> {
    const category = await this.findById(id);

    if (reparentChildren) {
      await this.categoryModel.updateMany(
        { parentId: id },
        { parentId: category.parentId },
      );
    } else {
      await this.categoryModel.updateMany(
        { parentId: id },
        { $unset: { parentId: 1 }, level: 0, path: '' },
      );
    }

    await this.categoryModel.findByIdAndDelete(id);
  }
}
