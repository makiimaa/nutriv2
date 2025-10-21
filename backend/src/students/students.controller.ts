/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ClassEntity } from '../classes/class.schema';
import { Student, StudentDocument } from './student.schema';
import { UpdateHealthInfoDto } from './dto/update-health-info.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(
    private studentsService: StudentsService,
    @InjectModel(ClassEntity.name) private classModel: Model<any>,
    @InjectModel(Student.name)
    private readonly studentModel: Model<StudentDocument>,
  ) {}

  @Roles('admin')
  @Get()
  getAll() {
    return this.studentsService.findAll();
  }

  @Roles('admin', 'teacher')
  @Post()
  async create(@Req() req: any, @Body() body: any) {
    if (req.user.role === 'teacher') {
      const tid = new Types.ObjectId(req.user.userId || req.user.sub);
      const ok = await this.classModel.exists({
        _id: new Types.ObjectId(body.classId),
        $or: [{ teacherId: tid }, { assistantTeacherIds: tid }],
      });
      if (!ok)
        throw new ForbiddenException(
          'Bạn không có quyền tạo học sinh ngoài lớp của bạn',
        );

      const cls = await this.classModel
        .findById(body.classId)
        .select('schoolId');
      body.schoolId = cls?.schoolId?.toString();
    }
    return this.studentsService.create(body);
  }

  @Roles('admin', 'teacher')
  @Put(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    if (req.user.role === 'teacher') {
      const tid = new Types.ObjectId(req.user.userId || req.user.sub);
      const owns = await this.classModel.exists({
        _id: new Types.ObjectId(
          body.classId ?? (await this.studentsService.getClassId(id)),
        ),
        $or: [{ teacherId: tid }, { assistantTeacherIds: tid }],
      });
      if (!owns)
        throw new ForbiddenException(
          'Bạn không có quyền sửa học sinh ngoài lớp của bạn',
        );
    }
    return this.studentsService.update(id, body);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }

  @Roles('teacher', 'admin')
  @Get('mine')
  async mine(@Req() req: any) {
    const tid = req.user.userId || req.user.sub;
    const tidObj = new Types.ObjectId(tid);
    const classes = await this.classModel
      .find({ $or: [{ teacherId: tidObj }, { assistantTeacherIds: tidObj }] })
      .select('_id');
    const classIds = classes.map((c: any) => c._id.toString());
    return this.studentsService.findByClassIds(classIds);
  }

  @Roles('admin', 'teacher', 'parent')
  @Get('by-ids')
  async byIds(@Query('ids') ids: string) {
    const arr = (ids || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!arr.length) return [];
    return this.studentsService.findByIds(arr);
  }

  @Roles('admin', 'teacher', 'parent')
  @Get('me')
  async getMine(@Req() req: any) {
    if (req.user.role !== 'parent') {
      throw new ForbiddenException('Chỉ phụ huynh dùng endpoint này');
    }
    const sid = req.user.studentId;
    if (!sid)
      throw new ForbiddenException('Tài khoản phụ huynh chưa gán học sinh');
    const doc = await this.studentsService.findById(sid);
    if (!doc) throw new NotFoundException('Không tìm thấy học sinh');
    return doc;
  }

  @Roles('admin', 'teacher', 'parent')
  @Get(':id')
  async getOne(@Req() req: any, @Param('id') id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('ID không hợp lệ');

    if (req.user.role === 'parent') {
      const sid = String(req.user.studentId || '');
      if (!sid)
        throw new ForbiddenException('Tài khoản phụ huynh chưa gán học sinh');
      const doc = await this.studentsService.findById(sid);
      if (!doc) throw new NotFoundException('Không tìm thấy học sinh');
      return doc;
    }

    if (req.user.role === 'teacher') {
      const stu = await this.studentModel.findById(id).select('classId');
      if (!stu) throw new NotFoundException('Không tìm thấy học sinh');
      const tid = new Types.ObjectId(req.user.userId || req.user.sub);
      const owns = await this.classModel.exists({
        _id: new Types.ObjectId(stu.classId),
        $or: [{ teacherId: tid }, { assistantTeacherIds: tid }],
      });
      if (!owns)
        throw new ForbiddenException('Không có quyền xem học sinh này');
    }

    const doc = await this.studentsService.findById(id);
    if (!doc) throw new NotFoundException('Không tìm thấy học sinh');
    return doc;
  }

  @Roles('teacher', 'admin')
  @Post(':id/face-images')
  async addFace(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { imageUrl?: string; encodedFace: string },
  ) {
    if (req.user.role === 'teacher') {
      const classId = await this.studentsService.getClassId(id);
      if (!classId)
        throw new BadRequestException('Học sinh không xác định lớp');
      const tid = new Types.ObjectId(req.user.sub || req.user.userId);
      const owns = await this.classModel.exists({
        _id: new Types.ObjectId(classId),
        $or: [{ teacherId: tid }, { assistantTeacherIds: tid }],
      });
      if (!owns) throw new BadRequestException('Không có quyền');
    }
    return this.studentsService.pushFaceImage(id, body);
  }

  @Roles('admin', 'teacher')
  @Get(':id/health-info')
  async getHealthInfo(@Req() req: any, @Param('id') id: string) {
    if (req.user.role === 'teacher') {
      const tid = new Types.ObjectId(req.user.userId || req.user.sub);
      const owns = await this.classModel.exists({
        _id: new Types.ObjectId(await this.studentsService.getClassId(id)),
        $or: [{ teacherId: tid }, { assistantTeacherIds: tid }],
      });
      if (!owns) throw new ForbiddenException('Không có quyền');
    }
    const s = await this.studentsService.findById(id);
    if (!s) throw new NotFoundException('Không tìm thấy học sinh');
    return s.healthInfo ?? {};
  }

  @Roles('admin', 'teacher')
  @Put(':id/health-info')
  async updateHealthInfo(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateHealthInfoDto,
  ) {
    if (req.user.role === 'teacher') {
      const tid = new Types.ObjectId(req.user.userId || req.user.sub);
      const owns = await this.classModel.exists({
        _id: new Types.ObjectId(await this.studentsService.getClassId(id)),
        $or: [{ teacherId: tid }, { assistantTeacherIds: tid }],
      });
      if (!owns) throw new ForbiddenException('Không có quyền');
    }
    return this.studentsService.updateHealthInfo(id, body);
  }
}
