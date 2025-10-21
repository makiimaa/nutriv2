/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GroupingsService } from './groupings.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

@Controller('nutrition/groupings')
export class GroupingsController {
  constructor(private svc: GroupingsService) {}

  @Roles('teacher', 'admin')
  @Post('analyze')
  analyze(
    @Body()
    body: {
      classId: string;
      groupCount?: number;
      engine?: 'gemini' | 'ollama';
      teacherHint?: string;
    },
  ) {
    return this.svc.analyze(body);
  }

  @Roles('teacher', 'admin')
  @Post('save')
  save(
    @Body()
    body: {
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
    },
  ) {
    return this.svc.save(body);
  }

  @Get('list')
  list(
    @Query('classId') classId: string,
    @Query('page') page = '1',
    @Query('pageSize') ps = '10',
  ) {
    return this.svc.list(classId, Number(page), Number(ps));
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.svc.detail(id);
  }

  @Roles('teacher', 'admin')
  @Post(':id/regen')
  regen(@Param('id') id: string) {
    return this.svc.regen(id);
  }
}
