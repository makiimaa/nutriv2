/* eslint-disable @typescript-eslint/no-unsafe-call */

/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { MeasurementsService } from './measurements.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Parent, ParentDocument } from '../parents/parent.schema';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('measurements')
export class MeasurementsController {
  constructor(
    private svc: MeasurementsService,
    @InjectModel(Parent.name) private parentModel: Model<ParentDocument>,
  ) {}

  private async assertParentOwnsStudent(req: any, sidRaw?: string) {
    const parentId = req.user?.sub || req.user?.userId;
    if (!parentId) throw new ForbiddenException('Không xác định phụ huynh');

    const parent = await this.parentModel
      .findById(new Types.ObjectId(parentId))
      .select('studentIds')
      .lean();

    if (!parent) throw new ForbiddenException('Parent not found');

    const sid = (sidRaw || req.user?.studentId || '').toString().trim();
    if (!sid) throw new BadRequestException('Thiếu studentId');

    const sidObj = new Types.ObjectId(sid);
    const owned = (parent.studentIds || []).some(
      (x: any) => x.toString() === sidObj.toString(),
    );
    if (!owned) throw new ForbiddenException('Học sinh không thuộc phụ huynh');

    return sidObj;
  }

  @Roles('teacher', 'admin')
  @Post()
  create(@Req() req: any, @Body() body: any) {
    const teacherId = req.user.userId || req.user.sub;
    return this.svc.create(body, teacherId);
  }

  @Roles('teacher', 'admin')
  @Get('student/:studentId')
  list(
    @Param('studentId') studentId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.listByStudent(studentId, from, to);
  }

  @Roles('teacher', 'admin')
  @Get('student/:studentId/latest')
  latest(@Param('studentId') studentId: string) {
    return this.svc.getLatest(studentId);
  }

  @Roles('parent')
  @Get('mine')
  async mine(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('studentId') studentId?: string,
  ) {
    const sid = await this.assertParentOwnsStudent(req, studentId);
    return this.svc.listByStudent(String(sid), from, to);
  }

  @Roles('parent')
  @Get('mine/latest')
  async mineLatest(@Req() req: any, @Query('studentId') studentId?: string) {
    const sid = await this.assertParentOwnsStudent(req, studentId);
    return this.svc.getLatest(String(sid));
  }

  @Roles('parent')
  @Get('mine/compare')
  async compare(@Req() req: any, @Query('studentId') studentId?: string) {
    const sid = await this.assertParentOwnsStudent(req, studentId);
    return this.svc.compareWithClassAndWHO(String(sid));
  }
}
