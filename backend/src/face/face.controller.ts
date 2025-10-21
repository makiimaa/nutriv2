/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { promises as fsp } from 'fs';
import { join } from 'path';
import { faceUploadOptions } from '../common/upload.config';
import type { Express } from 'express';
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FaceService, type GalleryItem } from './face.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Student, StudentDocument } from '../students/student.schema';
import { Get, Param, Delete, Query } from '@nestjs/common';
import { Types } from 'mongoose';

import { existsSync } from 'fs';
function urlToPath(imageUrl: string) {
  const uploadsRoot = process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');
  const rel = imageUrl.replace(/^\/static/, '');
  return join(uploadsRoot, rel);
}

@Controller('face')
export class FaceController {
  constructor(
    private readonly face: FaceService,
    @InjectModel(Student.name)
    private readonly studentModel: Model<StudentDocument>,
  ) {}

  @Post('enroll')
  @UseInterceptors(FileInterceptor('image', faceUploadOptions))
  async enroll(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { studentId: string; schoolId?: string },
  ) {
    if (!file) throw new BadRequestException('Thiếu file ảnh');
    const { studentId } = body ?? {};
    if (!studentId) throw new BadRequestException('Thiếu studentId');

    const bytes: Buffer = file.buffer ?? (await fsp.readFile(file.path));

    const embRes = await this.face.getEmbedding(bytes);
    if (!embRes?.ok) return embRes;

    let imageUrl = '';
    const uploadsRoot =
      process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');
    if (file.path) {
      const rel = file.path.replace(uploadsRoot, '').replace(/\\/g, '/');
      imageUrl = `/static${rel}`;
    }

    await this.studentModel.updateOne(
      { _id: studentId },
      {
        $push: {
          faceImages: {
            imageUrl,
            encodedFace: embRes.embedding,
            uploadedAt: new Date(),
          },
        },
      },
      { upsert: false },
    );

    return { ok: true, imageUrl };
  }

  @Post('recognize')
  @UseInterceptors(FileInterceptor('image'))
  async recognize(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { classId: string },
  ) {
    if (!file) throw new BadRequestException('Thiếu file ảnh');
    const { classId } = body ?? {};
    if (!classId) throw new BadRequestException('Thiếu classId');

    let cid: Types.ObjectId;
    try {
      cid = new Types.ObjectId(classId);
    } catch {
      throw new BadRequestException('classId không hợp lệ');
    }

    const students = await this.studentModel
      .find(
        {
          classId: cid,
          $or: [{ isActive: true }, { isActive: { $exists: false } }],
        },
        { _id: 1, fullName: 1, faceImages: 1 },
      )
      .lean();

    console.log('[recognize] classId=', classId, 'found=', students.length);
    const debugSample = students.slice(0, 3).map((s) => ({
      _id: String(s._id),
      fullName: s.fullName,
      faceImagesLen: Array.isArray(s.faceImages) ? s.faceImages.length : 0,
      lastHasEncoded: !!(
        Array.isArray(s.faceImages) && s.faceImages.slice(-1)[0]?.encodedFace
      ),
    }));
    console.log('[recognize] sample=', debugSample);

    const gallery: { studentId: string; embedding: string }[] = [];
    for (const s of students) {
      const last = Array.isArray(s.faceImages)
        ? [...s.faceImages].reverse().find((x) => x?.encodedFace)
        : null;
      if (last?.encodedFace) {
        gallery.push({ studentId: String(s._id), embedding: last.encodedFace });
      }
    }

    if (!gallery.length) {
      return {
        ok: false,
        message: 'Lớp chưa có embedding. Kiểm tra classId/isActive/faceImages.',
      };
    }

    const bytes: Buffer =
      file.buffer ??
      (file.path ? await fsp.readFile(file.path) : Buffer.alloc(0));
    if (!bytes.length) throw new BadRequestException('Không đọc được ảnh');

    return this.face.match(bytes, gallery, 0.45);
  }

  @Post('recognize-multi')
  @UseInterceptors(FileInterceptor('image'))
  async recognizeMulti(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { classId: string },
  ) {
    if (!file) throw new BadRequestException('Thiếu file ảnh');
    const { classId } = body ?? {};
    if (!classId) throw new BadRequestException('Thiếu classId');

    let cid: Types.ObjectId;
    try {
      cid = new Types.ObjectId(classId);
    } catch {
      throw new BadRequestException('classId không hợp lệ');
    }

    const students = await this.studentModel
      .find(
        {
          classId: cid,
          $or: [{ isActive: true }, { isActive: { $exists: false } }],
        },
        { _id: 1, fullName: 1, faceImages: 1 },
      )
      .lean();

    const gallery: { studentId: string; embedding: string }[] = [];
    for (const s of students) {
      const lastWithEmb = Array.isArray(s.faceImages)
        ? [...s.faceImages].reverse().find((x) => x?.encodedFace)
        : null;
      if (lastWithEmb?.encodedFace) {
        gallery.push({
          studentId: String(s._id),
          embedding: lastWithEmb.encodedFace,
        });
      }
    }

    if (!gallery.length) {
      return { ok: false, message: 'Lớp chưa có embedding' };
    }

    const bytes: Buffer =
      file.buffer ??
      (file.path ? await fsp.readFile(file.path) : Buffer.alloc(0));
    if (!bytes.length) throw new BadRequestException('Không đọc được ảnh');

    return this.face.matchMany(bytes, gallery, 0.45, 1);
  }

  @Get('student/:studentId/faces')
  async listFaces(@Param('studentId') studentId: string) {
    const sid = new Types.ObjectId(studentId);
    const s = await this.studentModel.findById(sid, { faceImages: 1 }).lean();
    if (!s) return { ok: false, faces: [], message: 'Student không tồn tại' };

    const faces = (s.faceImages || []).map((fi: any) => ({
      _id: String(fi._id),
      imageUrl: fi.imageUrl || '',
      uploadedAt: fi.uploadedAt,
      hasEmbedding: !!fi.encodedFace,
    }));
    return { ok: true, faces };
  }

  @Delete('student/:studentId/face/:faceId')
  async deleteOneFace(
    @Param('studentId') studentId: string,
    @Param('faceId') faceId: string,
  ) {
    const sid = new Types.ObjectId(studentId);
    const fid = new Types.ObjectId(faceId);

    const s = await this.studentModel.findById(sid, { faceImages: 1 }).lean();
    if (!s) throw new BadRequestException('Student không tồn tại');

    const item = (s.faceImages || []).find(
      (x: any) => String(x._id) === String(fid),
    );
    if (!item) throw new BadRequestException('faceId không tồn tại');

    if (item.imageUrl) {
      try {
        const p = urlToPath(item.imageUrl);
        if (existsSync(p)) await fsp.unlink(p);
      } catch {}
    }

    await this.studentModel.updateOne(
      { _id: sid },
      { $pull: { faceImages: { _id: fid } } },
    );
    return { ok: true };
  }

  @Delete('student/:studentId/faces')
  async deleteAllFaces(
    @Param('studentId') studentId: string,
    @Query('keepFiles') keepFiles?: string,
  ) {
    const sid = new Types.ObjectId(studentId);
    const s = await this.studentModel.findById(sid, { faceImages: 1 }).lean();
    if (!s) throw new BadRequestException('Student không tồn tại');

    if (!keepFiles) {
      for (const it of s.faceImages || []) {
        if (it?.imageUrl) {
          try {
            const p = urlToPath(it.imageUrl);
            if (existsSync(p)) await fsp.unlink(p);
          } catch {}
        }
      }
    }
    await this.studentModel.updateOne(
      { _id: sid },
      { $set: { faceImages: [] } },
    );
    return { ok: true, removed: (s.faceImages || []).length };
  }

  @Get('class/:classId/status')
  async classStatus(@Param('classId') classId: string) {
    const cid = new Types.ObjectId(classId);
    const rows = await this.studentModel
      .find({ classId: cid }, { fullName: 1, schoolId: 1, faceImages: 1 })
      .lean();

    return rows.map((s: any) => ({
      _id: String(s._id),
      fullName: s.fullName,
      schoolId: String(s.schoolId),
      facesCount: Array.isArray(s.faceImages) ? s.faceImages.length : 0,
      hasEmbedding: !!(
        Array.isArray(s.faceImages) && s.faceImages.slice(-1)[0]?.encodedFace
      ),
    }));
  }
}
