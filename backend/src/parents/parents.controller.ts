// src/parents/parents.controller.ts
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
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
} from '@nestjs/common';
import { ParentsService } from './parents.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { ObjectIdPipe } from '../common/objectid.pipe';
import { UpdateParentSelfDto } from './dto/update-parent-self.dto';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('parents')
export class ParentsController {
  constructor(private readonly svc: ParentsService) {}

  @Roles('parent')
  @Get('me')
  me(@Req() req: any) {
    const uid = req.user?.userId || req.user?.sub;
    return this.svc.me(uid);
  }

  @Roles('parent')
  @Put('me')
  updateMe(@Req() req: any, @Body() body: UpdateParentSelfDto) {
    const uid = req.user?.userId || req.user?.sub;
    return this.svc.updateMe(uid, body);
  }

  @Roles('admin')
  @Get()
  list() {
    return this.svc.findAll();
  }

  @Roles('admin')
  @Get(':id')
  getOne(@Param('id', ObjectIdPipe) id: string) {
    return this.svc.findOne(id);
  }

  @Roles('admin')
  @Post()
  create(@Body() body: CreateParentDto) {
    return this.svc.create(body);
  }

  @Roles('admin')
  @Put(':id')
  update(@Param('id', ObjectIdPipe) id: string, @Body() body: UpdateParentDto) {
    return this.svc.update(id, body);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id', ObjectIdPipe) id: string) {
    return this.svc.remove(id);
  }
}
