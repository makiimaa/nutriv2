/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Student, StudentDocument } from './student.schema';

function toObjectId(id?: string) {
  if (!id) return undefined;
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException('ObjectId không hợp lệ');
  }
  return new Types.ObjectId(id);
}

function toDate(d?: string | Date) {
  if (!d) return undefined;
  const t = new Date(d);
  if (isNaN(t.getTime()))
    throw new BadRequestException('Ngày tháng không hợp lệ');
  return t;
}

function normalizeTag(s: string) {
  return s
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_\-\/]/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function uniqClean(
  list?: string[],
  opts: { prefix?: string; limit?: number } = {},
) {
  const { prefix = '', limit = 50 } = opts;
  if (!Array.isArray(list)) return [];
  const out = new Set<string>();
  for (const x of list) {
    const n = normalizeTag(String(x));
    if (n) {
      out.add(prefix ? `${prefix}${n}` : n);
      if (out.size >= limit) break;
    }
  }
  return Array.from(out);
}

@Injectable()
export class StudentsService {
  constructor(
    @InjectModel(Student.name) private model: Model<StudentDocument>,
  ) {}

  create(dto: any) {
    const payload: any = {
      ...dto,
      schoolProvidedId: dto.schoolProvidedId,
      dateOfBirth: toDate(dto.dateOfBirth),
      classId: toObjectId(dto.classId),
    };
    if (dto.schoolId) payload.schoolId = toObjectId(dto.schoolId);
    if (dto.enrollmentDate) payload.enrollmentDate = toDate(dto.enrollmentDate);
    return new this.model(payload).save();
  }

  findAll() {
    return this.model.find();
  }

  findById(id: string) {
    return this.model
      .findById(id)
      .populate({ path: 'classId', select: 'name' });
  }

  async findByIds(ids: string[]) {
    const objectIds = ids.filter(Boolean).map((id) => new Types.ObjectId(id));

    const docs = await this.model.find({ _id: { $in: objectIds } }).lean();
    return docs;
  }

  findByClassIds(classIds: string[]) {
    const ids = classIds.map((id) => toObjectId(id)!);
    return this.model.find({ classId: { $in: ids }, isActive: true });
  }

  async update(id: string, dto: any) {
    const payload: any = { ...dto };
    if (dto.schoolProvidedId) payload.schoolProvidedId = dto.schoolProvidedId;
    if (dto.dateOfBirth) payload.dateOfBirth = toDate(dto.dateOfBirth);
    if (dto.classId) payload.classId = toObjectId(dto.classId);
    if (dto.schoolId) payload.schoolId = toObjectId(dto.schoolId);

    const doc = await this.model.findByIdAndUpdate(id, payload, { new: true });
    if (!doc) throw new NotFoundException('Student not found');
    return doc;
  }

  async remove(id: string) {
    const doc = await this.model.findByIdAndDelete(id);
    if (!doc) throw new NotFoundException('Student not found');
    return { message: 'Deleted successfully' };
  }

  async getClassId(id: string) {
    const s = await this.model.findById(id).select('classId');
    return s?.classId?.toString();
  }

  async pushFaceImage(
    id: string,
    body: { imageUrl?: string; encodedFace: string },
  ) {
    return this.model.findByIdAndUpdate(
      id,
      {
        $push: {
          faceImages: {
            imageUrl: body.imageUrl,
            encodedFace: body.encodedFace,
            uploadedAt: new Date(),
          },
        },
      },
      { new: true },
    );
  }

  async updateHealthInfo(id: string, dto: Partial<Student['healthInfo']>) {
    const allergies = uniqClean(dto.allergies);
    const foodRestrictions = uniqClean(dto.foodRestrictions);

    const doc = await this.model.findByIdAndUpdate(
      id,
      {
        $set: {
          'healthInfo.allergies': allergies,
          'healthInfo.foodRestrictions': foodRestrictions,
          'healthInfo.medicalHistory': dto.medicalHistory ?? '',
          'healthInfo.specialNeeds': dto.specialNeeds ?? '',
        },
      },
      { new: true },
    );
    if (!doc) throw new NotFoundException('Student not found');
    return doc.healthInfo;
  }
}
