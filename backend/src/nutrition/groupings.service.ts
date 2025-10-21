/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { HttpException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GroupingsService {
  private base = process.env.FASTAPI_BASE || 'http://127.0.0.1:8001';

  constructor(private http: HttpService) {}

  async analyze(body: {
    classId: string;
    groupCount?: number;
    engine?: 'gemini' | 'ollama';
    teacherHint?: string;
  }) {
    try {
      const r = await firstValueFrom(
        this.http.post(`${this.base}/nutrition/group/analyze`, body, {
          timeout: 90000,
        }),
      );
      return r.data;
    } catch (e: any) {
      const status = e?.response?.status || 502;
      const data = e?.response?.data || {
        message: e?.message || 'Upstream error',
      };
      throw new HttpException(data, status);
    }
  }

  async save(body: {
    classId: string;
    name?: string;
    engine: 'gemini' | 'ollama';
    groupCount: number;
    teacherHint?: string;
    groups: {
      key: string;
      name: string;
      description?: string;
      criteriaSummary?: any;
      studentIds: string[];
    }[];
  }) {
    try {
      const r = await firstValueFrom(
        this.http.post(`${this.base}/nutrition/group/save`, body, {
          timeout: 30000,
        }),
      );
      return r.data;
    } catch (e: any) {
      const status = e?.response?.status || 502;
      const data = e?.response?.data || {
        message: e?.message || 'Upstream error',
      };
      throw new HttpException(data, status);
    }
  }

  async list(classId: string, page = 1, pageSize = 10) {
    try {
      const r = await firstValueFrom(
        this.http.get(`${this.base}/nutrition/group/list`, {
          params: { classId, page, pageSize },
          timeout: 15000,
        }),
      );
      return r.data;
    } catch (e: any) {
      const status = e?.response?.status || 502;
      const data = e?.response?.data || {
        message: e?.message || 'Upstream error',
      };
      throw new HttpException(data, status);
    }
  }

  async detail(id: string) {
    try {
      const r = await firstValueFrom(
        this.http.get(`${this.base}/nutrition/group/${id}`, { timeout: 15000 }),
      );
      return r.data;
    } catch (e: any) {
      const status = e?.response?.status || 502;
      const data = e?.response?.data || {
        message: e?.message || 'Upstream error',
      };
      throw new HttpException(data, status);
    }
  }

  async regen(id: string) {
    const r = await firstValueFrom(
      this.http.post(
        `${this.base}/nutrition/group/${id}/regen`,
        {},
        { timeout: 90000 },
      ),
    );
    return r.data;
  }
}
