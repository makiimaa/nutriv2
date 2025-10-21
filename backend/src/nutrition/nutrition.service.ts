/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import axios from 'axios';

@Injectable()
export class NutritionService {
  private base = process.env.FASTAPI_BASE || 'http://127.0.0.1:8001';
  constructor(private http: HttpService) {}

  async generate(body: {
    studentId: string;
    period: 'day' | 'week';
    engine: 'gemini' | 'ollama';
  }) {
    const r = await firstValueFrom(
      this.http.post(`${this.base}/nutrition/generate`, body),
    );
    return r.data;
  }
  async generateClass(body: {
    classId: string;
    period: 'day' | 'week';
    engine: 'gemini' | 'ollama';
  }) {
    const r = await firstValueFrom(
      this.http.post(`${this.base}/nutrition/generate-class`, body),
    );
    return r.data;
  }
  async latest(studentId: string) {
    const r = await firstValueFrom(
      this.http.get(`${this.base}/nutrition/latest`, { params: { studentId } }),
    );
    return r.data;
  }
  async list(studentId: string, limit = 10) {
    const r = await firstValueFrom(
      this.http.get(`${this.base}/nutrition/list`, {
        params: { studentId, limit },
      }),
    );
    return r.data;
  }

  async getRecommendationDetail(id: string) {
    const url = `${this.base}/nutrition/detail/${id}`;
    const res = await axios.get(url, {
      timeout: 15000,
      validateStatus: () => true,
    });
    return res.data;
  }

  private async callPlanner(payload: any) {
    const r = await firstValueFrom(
      this.http.post(`${this.base}/nutrition/plan-menus`, payload, {
        timeout: 90000,
      }),
    );
    return r.data;
  }

  async classPreview(
    body: {
      classId: string;
      startDate: string;
      days: number;
      engine: 'gemini' | 'ollama';
    },
    userId: string,
  ) {
    const data = await this.callPlanner({ scope: 'class', ...body });
    return data;
  }

  async studentPreview(
    body: { studentId: string; dates: string[]; engine: 'gemini' | 'ollama' },
    userId: string,
  ) {
    const data = await this.callPlanner({ scope: 'student', ...body });
    return data;
  }

  async savePlan(items: any[], userId: string) {
    const res = await axios.post(
      `${process.env.API_BASE || 'http://127.0.0.1:3000'}/menus/bulk-save`,
      { items },
      { headers: { Authorization: '' } },
    );
    return res.data;
  }

  async planMenus(body: {
    classId: string;
    startDate: string;
    days: number;
    engine: 'gemini' | 'ollama';
    groupId?: string;
  }) {
    const r = await firstValueFrom(
      this.http.post(`${this.base}/nutrition/plan-menus`, body, {
        timeout: 120000,
      }),
    );
    return r.data;
  }

  async planStudent(body: {
    studentId: string;
    startDate: string;
    days: number;
    engine: 'gemini' | 'ollama';
  }) {
    const r = await firstValueFrom(
      this.http.post(`${this.base}/nutrition/plan-student`, body, {
        timeout: 90000,
      }),
    );
    return r.data;
  }

  async listDrafts(classId?: string, page = 1, pageSize = 10) {
    const r = await firstValueFrom(
      this.http.get(`${this.base}/nutrition/drafts`, {
        params: { classId, page, pageSize },
      }),
    );
    return r.data;
  }

  async classContext(classId: string, days = 7) {
    const r = await firstValueFrom(
      this.http.get(
        `${process.env.API_BASE || 'http://127.0.0.1:3000'}/stats/class-context`,
        { params: { classId, days } },
      ),
    );
    return r.data;
  }
}
