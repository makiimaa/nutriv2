/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ClassEntity, ClassDocument } from './class.schema';

@Injectable()
export class ClassesService {
  constructor(
    @InjectModel(ClassEntity.name) private model: Model<ClassDocument>,
  ) {}

  create(dto: any) {
    const assistantIds = Array.isArray(dto.assistantTeacherIds)
      ? dto.assistantTeacherIds
          .filter(Boolean)
          .map((id: string) => new Types.ObjectId(id))
      : [];

    const doc = new this.model({
      ...dto,
      schoolId: new Types.ObjectId(dto.schoolId),
      teacherId: new Types.ObjectId(dto.teacherId),
      assistantTeacherIds: assistantIds,
      schedule: {
        startTime: dto.startTime || undefined,
        endTime: dto.endTime || undefined,
      },
    });

    return doc.save().then((saved) => {
      return saved;
    });
  }

  findAll() {
    return this.model.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'students',
          let: { cid: '$_id' },
          pipeline: [
            {
              $match: { $expr: { $eq: ['$classId', '$$cid'] }, isActive: true },
            },
            { $count: 'c' },
          ],
          as: 'stuCount',
        },
      },
      {
        $addFields: {
          studentCount: { $ifNull: [{ $arrayElemAt: ['$stuCount.c', 0] }, 0] },
          startTime: '$schedule.startTime',
          endTime: '$schedule.endTime',
        },
      },
      { $project: { stuCount: 0 } },
    ]);
  }

  findMine(teacherId: string) {
    const tid = new Types.ObjectId(teacherId);
    return this.model.find({
      $or: [{ teacherId: tid }, { assistantTeacherIds: tid }],
    });
  }

  async update(id: string, dto: any) {
    const payload: any = { ...dto };
    if (dto.schoolId) payload.schoolId = new Types.ObjectId(dto.schoolId);
    if (dto.teacherId) payload.teacherId = new Types.ObjectId(dto.teacherId);
    if (Array.isArray(dto.assistantTeacherIds)) {
      payload.assistantTeacherIds = dto.assistantTeacherIds
        .filter(Boolean)
        .map((x: string) => new Types.ObjectId(x));
    }
    if (dto.startTime || dto.endTime) {
      payload.schedule = {
        startTime: dto.startTime || undefined,
        endTime: dto.endTime || undefined,
      };
    }

    const doc = await this.model.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
    if (!doc) throw new NotFoundException('Class not found');

    return doc;
  }

  async remove(id: string) {
    const doc = await this.model.findByIdAndDelete(id);
    if (!doc) throw new NotFoundException('Class not found');
    return { message: 'Deleted' };
  }
}
