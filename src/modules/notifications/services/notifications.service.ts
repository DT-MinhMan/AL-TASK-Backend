import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from '../schemas/notification.schema';
import { CreateNotificationDto } from '../dtos/create-notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
  ) {}

  async create(dto: CreateNotificationDto): Promise<NotificationDocument> {
    this.logger.log(`Creating notification for user: ${dto.userId}`);
    const notification = new this.notificationModel({
      ...dto,
      userId: new Types.ObjectId(dto.userId),
    });
    return notification.save();
  }

  async createBulk(userIds: string[], dto: Omit<CreateNotificationDto, 'userId'>): Promise<NotificationDocument[]> {
    this.logger.log(`Creating bulk notifications for ${userIds.length} users`);
    const notifications = userIds.map(userId => ({
      ...dto,
      userId: new Types.ObjectId(userId),
    }));
    return this.notificationModel.insertMany(notifications);
  }

  async findById(id: string): Promise<NotificationDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    const notification = await this.notificationModel.findById(id).exec();
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    return notification;
  }

  async findByUser(userId: string, page = 1, limit = 20): Promise<{ notifications: NotificationDocument[]; total: number; page: number; limit: number }> {
    this.logger.log(`Fetching notifications for user: ${userId}, page: ${page}, limit: ${limit}`);
    
    const skip = (page - 1) * limit;
    const query = this.notificationModel.find({ userId: new Types.ObjectId(userId) });

    const [notifications, total] = await Promise.all([
      query.sort({ isRead: 1, createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.notificationModel.countDocuments({ userId: new Types.ObjectId(userId) }).exec(),
    ]);

    return { notifications, total, page, limit };
  }

  async findUnread(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      isRead: false,
    }).exec();
  }

  async markAsRead(id: string): Promise<NotificationDocument> {
    this.logger.log(`Marking notification ${id} as read`);
    const notification = await this.findById(id);
    notification.isRead = true;
    return notification.save();
  }

  async markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
    this.logger.log(`Marking all notifications as read for user: ${userId}`);
    const result = await this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), isRead: false },
      { $set: { isRead: true } },
    ).exec();
    return { modifiedCount: result.modifiedCount };
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`Deleting notification: ${id}`);
    const result = await this.notificationModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
  }

  async deleteAll(userId: string): Promise<{ deletedCount: number }> {
    this.logger.log(`Deleting all notifications for user: ${userId}`);
    const result = await this.notificationModel.deleteMany({
      userId: new Types.ObjectId(userId),
    }).exec();
    return { deletedCount: result.deletedCount };
  }
}
