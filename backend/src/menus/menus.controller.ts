/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { MenusService } from './menus.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('menus')
export class MenusController {
  constructor(private svc: MenusService) {}

  @Roles('admin')
  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.svc.create(body, req.user.sub || req.user.userId);
  }

  @Roles('admin', 'teacher')
  @Get('school/:schoolId')
  list(
    @Param('schoolId') schoolId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.listBySchool(schoolId, from, to);
  }

  @Roles('admin', 'teacher')
  @Get('for-class/:classId')
  listForClass(
    @Param('classId') classId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.listForClass(classId, from, to);
  }

  @Roles('admin', 'teacher')
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.svc.getOne(id);
  }

  @Roles('admin')
  @Put(':id')
  update(@Param('id') id: string, @Body() patch: any) {
    return this.svc.update(id, patch);
  }
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  @Roles('teacher', 'admin')
  @Post('save-from-recs')
  saveFromRecs(
    @Req() req: any,
    @Body() body: { recIds: string[]; classId: string; schoolId: string },
  ) {
    return this.svc.saveFromDrafts({
      recIds: body.recIds,
      classId: body.classId,
      schoolId: body.schoolId,
      createdBy: req.user.sub || req.user.userId,
    });
  }

  @Roles('admin', 'teacher')
  @Get('for-class/:classId/paged')
  listForClassPaged(
    @Param('classId') classId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const p = Math.max(1, Number(page || 1)),
      ps = Math.min(50, Math.max(1, Number(pageSize || 10)));

    return this.svc.listForClass(classId, from, to).then((rows) => {
      const total = rows.length;
      const items = rows.slice((p - 1) * ps, (p - 1) * ps + ps);
      return { page: p, pageSize: ps, total, items };
    });
  }
}
