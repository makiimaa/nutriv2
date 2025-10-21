/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { Student, StudentDocument } from '../students/student.schema';
import { InjectModel } from '@nestjs/mongoose';
import { ClassEntity } from './class.schema';
import { Model, Types } from 'mongoose';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('classes')
export class ClassesController {
  constructor(
    private svc: ClassesService,
    @InjectModel(ClassEntity.name) private readonly classModel: Model<any>,
    @InjectModel(Student.name)
    private readonly studentModel: Model<StudentDocument>,
  ) {}

  @Roles('admin')
  @Get()
  getAll() {
    return this.svc.findAll();
  }

  @Roles('admin')
  @Post()
  create(@Body() body: CreateClassDto) {
    console.log('[ClassesController.create] body:', JSON.stringify(body));
    return this.svc.create(body);
  }

  @Roles('admin')
  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdateClassDto) {
    console.log(
      '[ClassesController.update] id:',
      id,
      ' body:',
      JSON.stringify(body),
    );
    return this.svc.update(id, body);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  @Roles('teacher', 'admin')
  @Get('mine')
  mine(@Req() req: any) {
    return this.svc.findMine(req.user.userId || req.user.sub);
  }

  @UseGuards(RolesGuard)
  @Roles('teacher', 'admin')
  @Get(':id/roster-embeddings')
  async rosterEmb(@Req() req: any, @Param('id') id: string) {
    if (req.user.role === 'teacher') {
      const tid = new Types.ObjectId(req.user.sub || req.user.userId);
      const cls = await this.classModel
        .findById(id)
        .select('teacherId assistantTeacherIds');
      const owns =
        cls &&
        (cls.teacherId?.equals(tid) ||
          (Array.isArray(cls.assistantTeacherIds) &&
            cls.assistantTeacherIds.some((x: Types.ObjectId) =>
              x?.equals(tid),
            )));
      if (!owns) throw new ForbiddenException('Không có quyền');
    }

    const students = await this.studentModel
      .find({ classId: new Types.ObjectId(id), isActive: true })
      .select('_id fullName faceImages.encodedFace');

    const out = students.map((s) => {
      const vecs = (s.faceImages || [])
        .filter((fi) => !!fi.encodedFace)
        .map((fi) => {
          try {
            if (!fi.encodedFace) return null;
            const json = Buffer.from(fi.encodedFace, 'base64').toString('utf8');
            return JSON.parse(json) as number[];
          } catch {
            return null;
          }
        })
        .filter(Boolean) as number[][];
      const mean = vecs.length ? avgVec(vecs) : [];
      return { _id: s._id.toString(), fullName: s.fullName, embedding: mean };
    });

    return out;
  }
}

function avgVec(vs: number[][]): number[] {
  const n = vs.length,
    d = vs[0]?.length || 0;
  const r = Array(d).fill(0);
  for (const v of vs) for (let i = 0; i < d; i++) r[i] += v[i];
  for (let i = 0; i < d; i++) r[i] /= n || 1;
  return r;
}
