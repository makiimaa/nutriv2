/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';

const UPLOADS_ROOT = process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export const faceImageFileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  const ok = ['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype);
  cb(null, ok);
};

export const studentFaceStorage = diskStorage({
  destination: (req, file, cb) => {
    const schoolId = req.body?.schoolId || 'unknown-school';
    const studentId = req.body?.studentId || 'unknown-student';
    const dir = join(UPLOADS_ROOT, 'schools', schoolId, 'students', studentId);
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ts = Date.now();
    const ext = extname(file.originalname || '') || '.jpg';
    const rand = randomUUID().slice(0, 8);
    cb(null, `${ts}-${rand}${ext}`);
  },
});

export const faceUploadOptions = {
  storage: studentFaceStorage,
  fileFilter: faceImageFileFilter,
  limits: { fileSize: 3 * 1024 * 1024 },
};
