/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import FormData from 'form-data';

export type GalleryItem = { studentId: string; embedding: string };

type EmbedResponse =
  | { ok: true; embedding: string }
  | { ok: false; message?: string };

type MatchResponse =
  | { ok: true; studentId: string; similarity: number }
  | { ok: false; message?: string; bestSim?: number };

@Injectable()
export class FaceService {
  private readonly base: string;

  constructor(private readonly cfg: ConfigService) {
    this.base =
      this.cfg.get<string>('FACE_EMBED_BASE') ??
      process.env.FACE_EMBED_BASE ??
      'http://localhost:8001';
  }

  async getEmbedding(fileBuffer: Buffer): Promise<EmbedResponse> {
    const form = new FormData();
    form.append('image', fileBuffer, {
      filename: 'face.jpg',
      contentType: 'image/jpeg',
    });

    const res = await axios.post(`${this.base}/face/embed`, form, {
      headers: form.getHeaders(),
      timeout: 15000,
      validateStatus: () => true,
    });

    return res.data as EmbedResponse;
  }

  async match(
    fileBuffer: Buffer,
    gallery: GalleryItem[],
    threshold = 0.45,
  ): Promise<MatchResponse> {
    const form = new FormData();
    form.append('image', fileBuffer, {
      filename: 'face.jpg',
      contentType: 'image/jpeg',
    });
    form.append('gallery', JSON.stringify(gallery));
    form.append('threshold', String(threshold));

    const res = await axios.post(`${this.base}/face/match`, form, {
      headers: form.getHeaders(),
      timeout: 15000,
      validateStatus: () => true,
    });

    return res.data as MatchResponse;
  }

  async matchMany(
    fileBuffer: Buffer,
    gallery: GalleryItem[],
    threshold = 0.45,
    topK = 1,
  ): Promise<{ ok: boolean; faces?: any[]; message?: string }> {
    const form = new FormData();
    form.append('image', fileBuffer, {
      filename: 'face.jpg',
      contentType: 'image/jpeg',
    });
    form.append('gallery', JSON.stringify(gallery));
    form.append('threshold', String(threshold));
    form.append('top_k', String(topK));

    const res = await axios.post(`${this.base}/face/match_many`, form, {
      headers: form.getHeaders(),
      timeout: 20000,
      validateStatus: () => true,
    });

    return res.data as any;
  }
}
