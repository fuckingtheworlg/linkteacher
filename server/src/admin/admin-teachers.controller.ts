import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TeacherStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audience } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';

class ListAdminTeachersDto {
  @IsOptional() @IsEnum(TeacherStatus) status?: TeacherStatus;
  @IsOptional() @IsString() keyword?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number;
}

class AuditTeacherDto {
  @IsBoolean() approve!: boolean;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

class UpdateTeacherFlagsDto {
  @IsOptional() @IsBoolean() isCertified?: boolean;
  @IsOptional() @IsInt() sortWeight?: number;
  @IsOptional() @IsEnum(TeacherStatus) status?: TeacherStatus;
}

@UseGuards(JwtAuthGuard)
@Audience('admin')
@Controller('admin/teachers')
export class AdminTeachersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() q: ListAdminTeachersDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where: import('@prisma/client').Prisma.TeacherWhereInput = {};
    if (q.status) where.status = q.status;
    if (q.keyword) {
      where.OR = [
        { user: { nickname: { contains: q.keyword } } },
        { user: { phone: { contains: q.keyword } } },
        { user: { openid: { contains: q.keyword } } },
      ];
    }
    const [total, list] = await this.prisma.$transaction([
      this.prisma.teacher.count({ where }),
      this.prisma.teacher.findMany({
        where,
        orderBy: [{ status: 'asc' }, { submittedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, openid: true, nickname: true, avatarUrl: true, phone: true, mbti: true } },
          educations: { include: { university: true }, orderBy: { sort: 'asc' } },
          subjects: {
            include: {
              subject: true,
              curriculums: { include: { curriculum: true } },
            },
          },
        },
      }),
    ]);
    return { page, pageSize, total, list };
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: {
        user: true,
        educations: { include: { university: true }, orderBy: { sort: 'asc' } },
        subjects: {
          include: { subject: true, curriculums: { include: { curriculum: true } } },
        },
      },
    });
    if (!teacher) throw new BusinessException('导师不存在', 404);
    return teacher;
  }

  @Post(':id/resume-audit')
  async auditResume(@Param('id', ParseIntPipe) id: number, @Body() dto: AuditTeacherDto) {
    const teacher = await this.prisma.teacher.findUnique({ where: { id } });
    if (!teacher) throw new BusinessException('导师不存在', 404);
    if (!teacher.resumeUrl) throw new BusinessException('该导师未上传简历');
    if (!dto.approve && !dto.reason) throw new BusinessException('驳回必须填写原因');

    return this.prisma.teacher.update({
      where: { id },
      data: dto.approve
        ? {
            resumeStatus: 'APPROVED',
            resumeReviewedAt: new Date(),
            resumeRejectReason: null,
          }
        : {
            resumeStatus: 'REJECTED',
            resumeReviewedAt: new Date(),
            resumeRejectReason: dto.reason,
          },
      select: {
        id: true,
        resumeStatus: true,
        resumeRejectReason: true,
        resumeReviewedAt: true,
      },
    });
  }

  @Post(':id/audit')
  async audit(@Param('id', ParseIntPipe) id: number, @Body() dto: AuditTeacherDto) {
    const teacher = await this.prisma.teacher.findUnique({ where: { id } });
    if (!teacher) throw new BusinessException('导师不存在', 404);
    if (teacher.status !== TeacherStatus.PENDING) {
      throw new BusinessException(`当前状态 ${teacher.status} 不可审核`);
    }
    if (!dto.approve && !dto.reason) throw new BusinessException('驳回必须填写原因');

    return this.prisma.teacher.update({
      where: { id },
      data: dto.approve
        ? {
            status: TeacherStatus.APPROVED,
            approvedAt: new Date(),
            rejectReason: null,
            isCertified: true,
          }
        : {
            status: TeacherStatus.REJECTED,
            rejectReason: dto.reason,
          },
    });
  }

  @Post(':id/flags')
  async flags(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTeacherFlagsDto) {
    const t = await this.prisma.teacher.findUnique({ where: { id } });
    if (!t) throw new BusinessException('导师不存在', 404);
    return this.prisma.teacher.update({
      where: { id },
      data: {
        isCertified: dto.isCertified,
        sortWeight: dto.sortWeight,
        status: dto.status,
      },
    });
  }

  @Get('stats/overview')
  async overview() {
    const [pending, approved, todayMatch, pendingResume] = await this.prisma.$transaction([
      this.prisma.teacher.count({ where: { status: TeacherStatus.PENDING } }),
      this.prisma.teacher.count({ where: { status: TeacherStatus.APPROVED } }),
      this.prisma.matchLog.count({
        where: { createdAt: { gte: new Date(new Date().toDateString()) } },
      }),
      this.prisma.teacher.count({ where: { resumeStatus: 'PENDING_REVIEW' } }),
    ]);
    return { pending, approved, todayMatch, pendingResume };
  }
}
