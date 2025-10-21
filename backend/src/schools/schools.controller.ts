import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('schools')
export class SchoolsController {
  constructor(private svc: SchoolsService) {}

  @Roles('admin', 'teacher')
  @Get()
  getAll() {
    return this.svc.findAll();
  }

  @Roles('admin')
  @Post()
  create(@Body() body: CreateSchoolDto) {
    return this.svc.create(body);
  }

  @Roles('admin')
  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdateSchoolDto) {
    return this.svc.update(id, body);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
