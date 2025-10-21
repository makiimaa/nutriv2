/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Teacher, TeacherDocument } from './teacher.schema';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import * as bcrypt from 'bcrypt';

@UseGuards(AuthGuard('jwt'))
@Controller('teachers')
export class TeachersController {
  constructor(
    @InjectModel(Teacher.name) private model: Model<TeacherDocument>,
  ) {}

  @Put('me')
  updateMe(@Req() req: any, @Body() body: any) {
    delete body.password;
    delete body.email;
    delete body.role;
    return this.model
      .findByIdAndUpdate(req.user.userId || req.user.sub, body, { new: true })
      .select('-password');
  }

  @Put('me/email')
  async changeEmail(@Req() req: any, @Body() body: { email: string }) {
    const email = (body?.email || '').trim().toLowerCase();
    if (!email || !email.includes('@'))
      throw new BadRequestException('Email không hợp lệ');

    const exists = await this.model.exists({
      email,
      _id: { $ne: req.user.userId || req.user.sub },
    });
    if (exists) throw new BadRequestException('Email đã được sử dụng');

    const updated = await this.model
      .findByIdAndUpdate(
        req.user.userId || req.user.sub,
        { email },
        { new: true },
      )
      .select('-password');
    return updated;
  }

  @Put('me/password')
  async changePassword(
    @Req() req: any,
    @Body() body: { oldPassword?: string; newPassword: string },
  ) {
    const user = await this.model.findById(req.user.userId || req.user.sub);
    if (!user) throw new BadRequestException('Tài khoản không tồn tại');

    const newPass = String(body?.newPassword || '');
    if (newPass.length < 6)
      throw new BadRequestException('Mật khẩu phải từ 6 ký tự');

    if (body?.oldPassword) {
      const ok = await bcrypt.compare(body.oldPassword, user.password);
      if (!ok) throw new BadRequestException('Mật khẩu cũ không đúng');
    }

    const hashed = await bcrypt.hash(newPass, 10);
    user.password = hashed;
    await user.save();
    return { message: 'Đổi mật khẩu thành công' };
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get()
  list() {
    return this.model.find().select('-password').sort({ createdAt: -1 });
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post()
  async create(@Body() body: any) {
    const hashed = await bcrypt.hash(body.password, 10);
    return new this.model({
      ...body,
      email: body.email.toLowerCase(),
      password: hashed,
    }).save();
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const patch: any = { ...body };
    if (patch.email) patch.email = String(patch.email).toLowerCase();
    if (patch.password) {
      if (String(patch.password).length < 6)
        throw new BadRequestException('Mật khẩu phải từ 6 ký tự');
      patch.password = await bcrypt.hash(String(patch.password), 10);
    }
    return this.model
      .findByIdAndUpdate(id, patch, { new: true })
      .select('-password');
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.model.findByIdAndDelete(id);
  }
}
