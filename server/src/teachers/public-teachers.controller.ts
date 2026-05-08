import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { ListTeachersDto } from './dto/list-teachers.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('teachers')
export class PublicTeachersController {
  constructor(private readonly svc: TeachersService) {}

  @Public()
  @Get()
  list(@Query() query: ListTeachersDto) {
    return this.svc.listPublic(query);
  }

  @Public()
  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.detailPublic(id);
  }
}
