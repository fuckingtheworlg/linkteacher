import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audience } from '../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { TeachersService } from './teachers.service';
import { UpsertTeacherDto } from './dto/upsert-teacher.dto';

@UseGuards(JwtAuthGuard)
@Audience('wx')
@Controller('teacher/me')
export class MeTeacherController {
  constructor(private readonly svc: TeachersService) {}

  @Get()
  me(@CurrentUser() u: JwtPayload) {
    return this.svc.getMe(u.sub);
  }

  @Put()
  save(@CurrentUser() u: JwtPayload, @Body() dto: UpsertTeacherDto) {
    return this.svc.upsertMe(u.sub, dto);
  }

  @Post('submit')
  submit(@CurrentUser() u: JwtPayload) {
    return this.svc.submitForAudit(u.sub);
  }
}
