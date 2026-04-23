import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Board, BoardDocument } from '../schemas/board.schema';
import { CreateBoardDto, BoardColumnDto } from '../dtos/create-board.dto';
import { UpdateBoardDto } from '../dtos/update-board.dto';

@Injectable()
export class BoardsService {
  private readonly logger = new Logger(BoardsService.name);

  private readonly defaultColumns: BoardColumnDto[] = [
    { id: 'todo', name: 'To Do', order: 0 },
    { id: 'inprogress', name: 'In Progress', order: 1 },
    { id: 'done', name: 'Done', order: 2 },
  ];

  constructor(
    @InjectModel(Board.name) private boardModel: Model<BoardDocument>,
  ) {}

  async create(createBoardDto: CreateBoardDto): Promise<BoardDocument> {
    this.logger.log(`Creating board: ${createBoardDto.name}`);

    const columns = createBoardDto.columns && createBoardDto.columns.length > 0
      ? createBoardDto.columns
      : this.defaultColumns;

    const board = new this.boardModel({
      ...createBoardDto,
      columns,
    });

    const savedBoard = await board.save();
    this.logger.log(`Board created with id: ${savedBoard._id}`);
    return savedBoard;
  }

  async findByProject(projectId: string): Promise<BoardDocument[]> {
    this.logger.log(`Finding boards for project: ${projectId}`);

    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project ID format');
    }

    return this.boardModel.find({ projectId: new Types.ObjectId(projectId) }).exec();
  }

  async findById(id: string): Promise<BoardDocument> {
    this.logger.log(`Finding board by id: ${id}`);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid board ID format');
    }

    const board = await this.boardModel.findById(id).exec();
    if (!board) {
      throw new NotFoundException(`Board with id ${id} not found`);
    }

    return board;
  }

  async update(id: string, updateBoardDto: UpdateBoardDto): Promise<BoardDocument> {
    this.logger.log(`Updating board: ${id}`);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid board ID format');
    }

    const board = await this.boardModel
      .findByIdAndUpdate(id, updateBoardDto, { new: true })
      .exec();

    if (!board) {
      throw new NotFoundException(`Board with id ${id} not found`);
    }

    this.logger.log(`Board updated: ${id}`);
    return board;
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`Deleting board: ${id}`);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid board ID format');
    }

    const result = await this.boardModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Board with id ${id} not found`);
    }

    this.logger.log(`Board deleted: ${id}`);
  }

  async updateColumns(id: string, columns: BoardColumnDto[]): Promise<BoardDocument> {
    this.logger.log(`Updating columns for board: ${id}`);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid board ID format');
    }

    const board = await this.boardModel
      .findByIdAndUpdate(id, { columns }, { new: true })
      .exec();

    if (!board) {
      throw new NotFoundException(`Board with id ${id} not found`);
    }

    this.logger.log(`Columns updated for board: ${id}`);
    return board;
  }
}
