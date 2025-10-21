/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Measurement, MeasurementDocument } from './measurement.schema';
import { Student } from '../students/student.schema';

@Injectable()
export class MeasurementsService {
  constructor(
    @InjectModel(Measurement.name) private model: Model<MeasurementDocument>,
  ) {}

  async create(dto: any, teacherId: string) {
    const date = new Date(dto.measurementDate);
    const heightM = dto.height / 100;
    const bmi = Number((dto.weight / (heightM * heightM)).toFixed(2));

    try {
      return await new this.model({
        studentId: new Types.ObjectId(dto.studentId),
        height: dto.height,
        weight: dto.weight,
        bmi,
        measurementDate: date,
        measuredBy: new Types.ObjectId(teacherId),
        notes: dto.notes,
      }).save();
    } catch (e: any) {
      if (e?.code === 11000)
        throw new ConflictException('Ngày đo này đã tồn tại cho học sinh');
      throw e;
    }
  }

  async listByStudent(studentId: string, from?: string, to?: string) {
    const q: any = { studentId: new Types.ObjectId(studentId) };
    if (from || to) {
      q.measurementDate = {};
      if (from) q.measurementDate.$gte = new Date(from);
      if (to) q.measurementDate.$lte = new Date(to);
    }
    return this.model.find(q).sort({ measurementDate: -1, _id: -1 });
  }

  async getLatest(studentId: string) {
    const row = await this.model
      .findOne({ studentId: new Types.ObjectId(studentId) })
      .sort({ measurementDate: -1, _id: -1 });
    if (!row) throw new NotFoundException('Chưa có dữ liệu đo');
    return row;
  }

  async compareWithClassAndWHO(studentId: string) {
    const latest = await this.getLatest(studentId).catch((e) => {
      throw e;
    });

    const StudentModel = this.model.db.model<Student>('Student');
    const student = (await StudentModel.findById(studentId)
      .select('classId dateOfBirth gender')
      .lean()) as Pick<Student, 'classId' | 'dateOfBirth' | 'gender'> | null;

    if (!student) {
      throw new NotFoundException('Không tìm thấy học sinh');
    }

    const classAvg = await this.model.aggregate([
      {
        $match: {
          studentId: {
            $in: await StudentModel.find({ classId: student.classId }).distinct(
              '_id',
            ),
          },
        },
      },
      { $sort: { measurementDate: -1 } },
      {
        $group: {
          _id: '$studentId',
          lastHeight: { $first: '$height' },
          lastWeight: { $first: '$weight' },
          lastBmi: { $first: '$bmi' },
        },
      },
      {
        $group: {
          _id: null,
          height: { $avg: '$lastHeight' },
          weight: { $avg: '$lastWeight' },
          bmi: { $avg: '$lastBmi' },
        },
      },
    ]);
    const avg = classAvg[0] || { height: 0, weight: 0, bmi: 0 };

    const who = this.getWHOStandard(
      student.gender,
      latest.height,
      latest.weight,
      latest.bmi,
      student.dateOfBirth,
    );

    return {
      student: {
        height: latest.height,
        weight: latest.weight,
        bmi: latest.bmi,
      },
      classAvg: avg,
      who,
    };
  }

  private getWHOStandard(
    gender: string,
    h: number,
    w: number,
    bmi: number,
    dob?: Date,
  ) {
    const ageY = dob
      ? (Date.now() - dob.getTime()) / (365 * 24 * 3600 * 1000)
      : 5;
    const range = (v: number, delta: number) => [
      +(v - delta).toFixed(1),
      +(v + delta).toFixed(1),
    ];

    const idealH = ageY * 6 + 70;
    const idealW = (idealH - 100) * 0.9;
    const idealBMI = +(idealW / (idealH / 100) ** 2).toFixed(1);

    return {
      heightRange: range(idealH, 5),
      weightRange: range(idealW, 2),
      bmiRange: range(idealBMI, 1.5),
    };
  }
}
