/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import {
  ConversationThread,
  ConversationThreadDocument,
} from './conversation-thread.schema';
import {
  ConversationMessage,
  ConversationMessageDocument,
} from './conversation-message.schema';
import { Student, StudentDocument } from '../students/student.schema';
import { ClassEntity, ClassDocument } from '../classes/class.schema';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(
    @InjectModel(ConversationThread.name)
    private tModel: Model<ConversationThreadDocument>,
    @InjectModel(ConversationMessage.name)
    private mModel: Model<ConversationMessageDocument>,
    @InjectModel(Student.name) private sModel: Model<StudentDocument>,
    @InjectModel(ClassEntity.name) private cModel: Model<ClassDocument>,
  ) {}

  private async ensureTeacherOwnsStudent(req: any, studentId: Types.ObjectId) {
    const stu = await this.sModel.findById(studentId).select('classId');
    if (!stu?.classId) throw new NotFoundException('Học sinh không tồn tại');
    const tid = new Types.ObjectId(req.user.sub || req.user.userId);
    const owns = await this.cModel.exists({
      _id: new Types.ObjectId(stu.classId),
      $or: [{ teacherId: tid }, { assistantTeacherId: tid }],
    });
    if (!owns) throw new ForbiddenException('Không có quyền với học sinh này');
  }

  @Roles('parent', 'teacher', 'admin')
  @Post('thread/init')
  async initThread(@Req() req: any, @Body() body: { studentId?: string }) {
    const sidRaw =
      req.user.role === 'parent' ? req.user.studentId : body?.studentId;
    if (!sidRaw || !Types.ObjectId.isValid(String(sidRaw))) {
      throw new BadRequestException('Thiếu hoặc studentId không hợp lệ');
    }
    const sid = new Types.ObjectId(String(sidRaw));

    if (req.user.role === 'teacher')
      await this.ensureTeacherOwnsStudent(req, sid);

    let th = await this.tModel.findOne({ studentId: sid });
    if (!th) {
      th = await new this.tModel({
        studentId: sid,
        teacherIds:
          req.user.role === 'teacher'
            ? [new Types.ObjectId(req.user.sub || req.user.userId)]
            : [],
        parentId:
          req.user.role === 'parent'
            ? new Types.ObjectId(req.user.sub || req.user.userId)
            : undefined,
        lastMessageAt: new Date(),
      }).save();
    } else {
      if (req.user.role === 'parent' && !th.parentId) {
        th.parentId = new Types.ObjectId(req.user.sub || req.user.userId);
        await th.save();
      }
      if (req.user.role === 'teacher') {
        const tid = new Types.ObjectId(req.user.sub || req.user.userId);
        if (!th.teacherIds.some((x) => String(x) === String(tid))) {
          th.teacherIds.push(tid);
          await th.save();
        }
      }
    }
    return th;
  }

  @Roles('parent', 'teacher')
  @Get('my-threads')
  async myThreads(@Req() req: any) {
    if (req.user.role === 'parent') {
      const sid = new Types.ObjectId(req.user.studentId);
      const th = await this.tModel
        .findOne({ studentId: sid })
        .sort({ lastMessageAt: -1 })
        .populate('studentId', 'fullName name')
        .lean();
      if (!th) return [];
      const student = (th as any).studentId;
      return [
        {
          ...th,
          studentId: student?._id ?? th.studentId,
          studentName:
            student?.fullName || student?.name || String(th.studentId),
        },
      ];
    }

    const tid = new Types.ObjectId(req.user.sub || req.user.userId);
    const list = await this.tModel
      .find({ teacherIds: tid })
      .sort({ lastMessageAt: -1 })
      .populate('studentId', 'fullName name')
      .lean();

    return list.map((th: any) => {
      const st = th.studentId;
      return {
        ...th,
        studentId: st?._id ?? th.studentId,
        studentName: st?.fullName || st?.name || String(th.studentId),
      };
    });
  }

  @Roles('parent', 'teacher')
  @Get(':threadId/messages')
  async listMessages(
    @Req() req: any,
    @Param('threadId') threadId: string,
    @Query('cursor') cursor?: string,
  ) {
    const th = await this.tModel.findById(threadId);
    if (!th) throw new NotFoundException('Thread không tồn tại');

    if (req.user.role === 'parent') {
      const sid = new Types.ObjectId(req.user.studentId);
      if (String(th.studentId) !== String(sid))
        throw new ForbiddenException('Không có quyền');
    } else {
      await this.ensureTeacherOwnsStudent(
        req,
        new Types.ObjectId(th.studentId),
      );
    }

    const q: any = { threadId: th._id };
    if (cursor) q._id = { $lt: new Types.ObjectId(cursor) };
    const rows = await this.mModel.find(q).sort({ _id: -1 }).limit(50);
    return rows;
  }

  @Roles('parent', 'teacher')
  @Post(':threadId/messages')
  async sendMessage(
    @Req() req: any,
    @Param('threadId') threadId: string,
    @Body() body: { content: string },
  ) {
    if (!body?.content?.trim()) throw new BadRequestException('Thiếu nội dung');

    const th = await this.tModel.findById(threadId);
    if (!th) throw new NotFoundException('Thread không tồn tại');

    if (req.user.role === 'parent') {
      const sid = new Types.ObjectId(req.user.studentId);
      if (String(th.studentId) !== String(sid))
        throw new ForbiddenException('Không có quyền');
    } else {
      await this.ensureTeacherOwnsStudent(
        req,
        new Types.ObjectId(th.studentId),
      );
      const tid = new Types.ObjectId(req.user.sub || req.user.userId);
      if (!th.teacherIds.some((x) => String(x) === String(tid))) {
        th.teacherIds.push(tid);
      }
    }

    const msg = await new this.mModel({
      threadId: th._id,
      senderId: new Types.ObjectId(req.user.sub || req.user.userId),
      senderRole: req.user.role === 'parent' ? 'parent' : 'teacher',
      content: body.content.trim(),
    }).save();

    th.lastMessageAt = new Date();
    await th.save();

    return msg;
  }
}
