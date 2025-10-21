/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Teacher, TeacherDocument } from '../teachers/teacher.schema';
import { Parent, ParentDocument } from '../parents/parent.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Teacher.name) private teacherModel: Model<TeacherDocument>,
    @InjectModel(Parent.name) private parentModel: Model<ParentDocument>,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const teacher = await this.teacherModel.findOne({
      email: email.toLowerCase(),
      isActive: true,
    });
    if (teacher) {
      const ok = await bcrypt.compare(password, teacher.password);
      if (!ok) throw new UnauthorizedException('Sai mật khẩu');
      const payload = {
        sub: teacher._id.toString(),
        role: teacher.role,
        email: teacher.email,
        name: teacher.fullName,
      };
      return { token: this.jwt.sign(payload) };
    }

    const parent = await this.parentModel.findOne({
      email: email.toLowerCase(),
      isActive: true,
    });
    if (!parent)
      throw new UnauthorizedException('Email không tồn tại hoặc bị khóa');

    const ok = await bcrypt.compare(password, parent.password);
    if (!ok) throw new UnauthorizedException('Sai mật khẩu');

    const studentIds = (parent.studentIds || []).map((id) => id.toString());
    const payload = {
      sub: parent._id.toString(),
      role: 'parent' as const,
      email: parent.email,
      name: parent.name,

      studentId: studentIds[0] || undefined,

      studentIds,
    };
    return { token: this.jwt.sign(payload) };
  }

  async createTeacher(data: {
    employeeId: string;
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
    dateOfBirth?: string;
    role?: 'teacher' | 'admin';
    schoolId?: string;
  }) {
    const exists = await this.teacherModel.findOne({
      $or: [
        { email: data.email.toLowerCase() },
        { employeeId: data.employeeId },
      ],
    });
    if (exists) throw new ConflictException('Email hoặc employeeId đã tồn tại');
    const hashed = await bcrypt.hash(data.password, 10);
    return new this.teacherModel({
      employeeId: data.employeeId,
      fullName: data.fullName,
      email: data.email.toLowerCase(),
      password: hashed,
      phone: data.phone,
      address: data.address,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      role: data.role || 'teacher',
      schoolId: data.schoolId ? new Types.ObjectId(data.schoolId) : undefined,
    }).save();
  }

  async me(userId: string) {
    const t = await this.teacherModel.findById(userId).select('-password');
    if (t) return t;

    return this.parentModel.findById(userId).select('-password');
  }

  async updateMe(userId: string, patch: any) {
    delete patch.password;
    delete patch.role;
    delete patch.email;
    if (patch.dateOfBirth) patch.dateOfBirth = new Date(patch.dateOfBirth);
    return this.teacherModel
      .findByIdAndUpdate(userId, patch, { new: true })
      .select('-password');
  }
}
