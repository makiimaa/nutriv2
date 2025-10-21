/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Parent, ParentDocument } from './parent.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ParentsService {
  constructor(@InjectModel(Parent.name) private model: Model<ParentDocument>) {}

  async create(dto: {
    studentIds?: string[];
    studentId?: string;
    name: string;
    phone?: string;
    email: string;
    password: string;
  }) {
    if (!dto.phone?.trim()) {
      throw new BadRequestException('Thiếu số điện thoại');
    }

    const exists = await this.model.findOne({
      $or: [{ email: dto.email.toLowerCase() }, { phone: dto.phone }],
    });
    if (exists)
      throw new ConflictException('Email hoặc số điện thoại đã tồn tại');

    const ids = Array.isArray(dto.studentIds)
      ? dto.studentIds
      : dto.studentId
        ? [dto.studentId]
        : [];
    if (ids.length === 0)
      throw new BadRequestException('Thiếu danh sách học sinh');

    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    const hashed = await bcrypt.hash(dto.password, 10);

    return new this.model({
      studentIds: uniqueIds.map((id) => new Types.ObjectId(id)),
      name: dto.name,
      phone: dto.phone,
      email: dto.email.toLowerCase(),
      password: hashed,
      role: 'parent',
      isActive: true,
    }).save();
  }

  findAll() {
    return this.model.find().select('-password').sort({ createdAt: -1 });
  }

  async findOne(id: string) {
    const doc = await this.model.findById(id).select('-password');
    if (!doc) throw new NotFoundException('Parent not found');
    return doc;
  }

  async update(
    id: string,
    dto: Partial<{
      studentIds: string[];
      studentId: string;
      name: string;
      phone: string;
      email: string;
      password: string;
      isActive: boolean;
    }>,
  ) {
    const patch: any = { ...dto };

    if (dto.studentIds || dto.studentId) {
      const ids = Array.isArray(dto.studentIds)
        ? dto.studentIds
        : dto.studentId
          ? [dto.studentId]
          : [];
      const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
      patch.studentIds = uniqueIds.map((id) => new Types.ObjectId(id));
    }

    if (dto.email) patch.email = dto.email.toLowerCase();
    if (dto.password) patch.password = await bcrypt.hash(dto.password, 10);

    const doc = await this.model
      .findByIdAndUpdate(id, patch, { new: true })
      .select('-password');
    if (!doc) throw new NotFoundException('Parent not found');
    return doc;
  }

  async remove(id: string) {
    const doc = await this.model.findByIdAndDelete(id);
    if (!doc) throw new NotFoundException('Parent not found');
    return { message: 'Deleted' };
  }

  async findByIdRaw(id: string) {
    return this.model.findById(id);
  }

  async me(userId: string) {
    const doc = await this.model.findById(userId).select('-password');
    if (!doc) throw new NotFoundException('Parent not found');
    return doc;
  }

  async updateMe(
    userId: string,
    dto: Partial<{
      name: string;
      phone: string;
      email: string;
      password: string;
    }>,
  ) {
    if (dto.email || dto.phone) {
      const or: any[] = [];
      if (dto.email) or.push({ email: dto.email.toLowerCase() });
      if (dto.phone) or.push({ phone: dto.phone });
      if (or.length) {
        const dup = await this.model.findOne({
          $or: or,
          _id: { $ne: new Types.ObjectId(userId) },
        });
        if (dup)
          throw new ConflictException('Email hoặc số điện thoại đã được dùng');
      }
    }

    const patch: any = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.email !== undefined) patch.email = dto.email.toLowerCase();
    if (dto.password) patch.password = await bcrypt.hash(dto.password, 10);

    const doc = await this.model
      .findByIdAndUpdate(userId, patch, { new: true })
      .select('-password');
    if (!doc) throw new NotFoundException('Parent not found');
    return doc;
  }
}
