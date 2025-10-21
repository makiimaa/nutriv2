/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Controller, Post, Get, Body, Query, Param } from '@nestjs/common';
import { NutritionService } from './nutrition.service';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('nutrition')
export class NutritionController {
  constructor(private nutri: NutritionService) {}

  @Post('generate')
  generate(
    @Body()
    body: {
      studentId: string;
      period?: 'day' | 'week';
      engine?: 'gemini' | 'ollama';
    },
  ) {
    const b = { period: 'day', engine: 'gemini', ...body } as any;
    return this.nutri.generate(b);
  }

  @Post('generate-class')
  generateClass(
    @Body()
    body: {
      classId: string;
      period?: 'day' | 'week';
      engine?: 'gemini' | 'ollama';
    },
  ) {
    const b = { period: 'day', engine: 'gemini', ...body } as any;
    return this.nutri.generateClass(b);
  }

  @Get('latest')
  latest(@Query('studentId') studentId: string) {
    return this.nutri.latest(studentId);
  }

  @Get('list')
  list(@Query('studentId') studentId: string, @Query('limit') limit?: string) {
    return this.nutri.list(studentId, limit ? Number(limit) : 10);
  }

  @Get('recommendation/:id')
  async detailStd(@Param('id') id: string) {
    return this.nutri.getRecommendationDetail(id);
  }

  @Get('detail/:id')
  async detailAlias(@Param('id') id: string) {
    return this.nutri.getRecommendationDetail(id);
  }

  @Roles('teacher', 'admin')
  @Post('plan-menus')
  planMenus(
    @Body()
    body: {
      classId: string;
      startDate: string;
      days: number;
      engine: 'gemini' | 'ollama';
      groupId?: string;
    },
  ) {
    return this.nutri.planMenus(body);
  }

  @Roles('teacher', 'admin')
  @Post('plan-student')
  planStudent(
    @Body()
    body: {
      studentId: string;
      startDate: string;
      days: number;
      engine: 'gemini' | 'ollama';
    },
  ) {
    return this.nutri.planStudent(body);
  }

  @Roles('teacher', 'admin')
  @Get('drafts')
  drafts(
    @Query('classId') classId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.nutri.listDrafts(
      classId,
      Number(page || 1),
      Number(pageSize || 10),
    );
  }

  @Get('context')
  context(@Query('classId') classId: string, @Query('days') days = '7') {
    return this.nutri.classContext(classId, Number(days));
  }
}
