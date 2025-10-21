import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { School, SchoolDocument } from './school.schema';
@Injectable()
export class SchoolsService {
  constructor(@InjectModel(School.name) private model: Model<SchoolDocument>) {}
  create(dto: any) {
    return new this.model(dto).save();
  }
  findAll() {
    return this.model.find().sort({ createdAt: -1 });
  }
  async update(id: string, dto: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const doc = await this.model.findByIdAndUpdate(id, dto, { new: true });
    if (!doc) throw new NotFoundException('School not found');
    return doc;
  }
  async remove(id: string) {
    const doc = await this.model.findByIdAndDelete(id);
    if (!doc) throw new NotFoundException('School not found');
    return { message: 'Deleted' };
  }
}
