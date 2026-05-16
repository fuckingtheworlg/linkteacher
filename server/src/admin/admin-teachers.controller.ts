import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DegreeType, Gender, Prisma, TeacherStatus, UserRole } from '@prisma/client';
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

// ===== 管理员手动编辑 / 创建 老师 =====
class EducationItemDto {
  @IsInt() universityId!: number;
  @IsEnum(DegreeType) degree!: DegreeType;
  @IsString() @MaxLength(128) major!: string;
  @IsOptional() @IsInt() startYear?: number;
  @IsOptional() @IsInt() endYear?: number;
}

class SubjectItemDto {
  @IsInt() subjectId!: number;
  @IsArray() @IsInt({ each: true }) curriculumIds!: number[];
  @IsOptional() @IsString() note?: string;
}

class AdminUpsertTeacherDto {
  // user 字段
  @IsOptional() @IsString() @MaxLength(64) nickname?: string;
  @IsOptional() @IsString() avatarUrl?: string;
  @IsOptional() @IsString() @MaxLength(8) mbti?: string;
  @IsOptional() @IsString() @MaxLength(255) address?: string;
  @IsOptional() @IsString() @MaxLength(32) phone?: string;

  // teacher 字段
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsString() @MaxLength(64) country?: string;
  @IsOptional() @IsString() @MaxLength(64) city?: string;
  @IsOptional() @IsArray() headlines?: string[];
  @IsOptional() @IsArray() languages?: string[];
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsInt() @Min(0) teachingYears?: number;
  @IsOptional() @IsString() mentorExperience?: string;
  @IsOptional() @IsString() workHistory?: string;
  @IsOptional() @IsString() honors?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) hourlyRate?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) trialRate?: number;
  @IsOptional() @IsInt() @Min(1) minHours?: number;
  @IsOptional() @IsEnum(TeacherStatus) status?: TeacherStatus;
  @IsOptional() @IsBoolean() isCertified?: boolean;
  @IsOptional() @IsInt() sortWeight?: number;

  // 身份认证
  @IsOptional() @IsString() @MaxLength(64) realName?: string;
  @IsOptional() @IsString() addressDetail?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;

  // 子表（整组覆盖）
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => EducationItemDto)
  educations?: EducationItemDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SubjectItemDto)
  subjects?: SubjectItemDto[];
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

  // ============ 管理员手动创建老师（mock user 内嵌） ============
  @Post()
  async create(@Body() dto: AdminUpsertTeacherDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1) 创建一个占位 user（无 openid，由后台代管理）
      const fakeId = `admin_created_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const user = await tx.user.create({
        data: {
          openid: fakeId,
          role: UserRole.TEACHER,
          nickname: dto.nickname || '未命名导师',
          avatarUrl: dto.avatarUrl,
          mbti: dto.mbti,
          address: dto.address,
          phone: dto.phone,
        },
      });
      // 2) 创建 teacher
      const teacher = await tx.teacher.create({
        data: this.buildTeacherData(dto, user.id),
      });
      // 3) 子表
      await this.upsertChildren(tx, teacher.id, dto);
      return { id: teacher.id, userId: user.id };
    });
  }

  // ============ 管理员编辑老师（任意字段，含子表整组覆盖） ============
  @Patch(':id')
  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: AdminUpsertTeacherDto) {
    const exists = await this.prisma.teacher.findUnique({ where: { id } });
    if (!exists) throw new BusinessException('导师不存在', 404);

    return this.prisma.$transaction(async (tx) => {
      // 同步 user 卡片信息
      const userPatch: Prisma.UserUpdateInput = {};
      if (dto.nickname !== undefined) userPatch.nickname = dto.nickname;
      if (dto.avatarUrl !== undefined) userPatch.avatarUrl = dto.avatarUrl;
      if (dto.mbti !== undefined) userPatch.mbti = dto.mbti;
      if (dto.address !== undefined) userPatch.address = dto.address;
      if (dto.phone !== undefined) userPatch.phone = dto.phone;
      if (Object.keys(userPatch).length > 0) {
        await tx.user.update({ where: { id: exists.userId }, data: userPatch });
      }

      const updated = await tx.teacher.update({
        where: { id },
        data: this.buildTeacherData(dto, exists.userId, /* isUpdate */ true),
      });
      await this.upsertChildren(tx, id, dto);
      return updated;
    });
  }

  // ============ 删除老师（级联删 educations / subjects / favorites / matchLog 由 schema 处理） ============
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const t = await this.prisma.teacher.findUnique({ where: { id } });
    if (!t) throw new BusinessException('导师不存在', 404);
    // Teacher 上的 onDelete: Cascade 会自动级联删 educations / subjects / matchLog 软关联
    // user 本身保留，方便保留学生身份与历史记录
    await this.prisma.teacher.delete({ where: { id } });
    return { ok: true };
  }

  // ---------- helpers ----------
  private buildTeacherData(dto: AdminUpsertTeacherDto, userId: number, isUpdate = false) {
    const data: Prisma.TeacherUncheckedCreateInput = {
      userId,
      gender: dto.gender,
      country: dto.country,
      city: dto.city,
      headlines: dto.headlines ?? (isUpdate ? undefined : Prisma.JsonNull) as any,
      languages: dto.languages ?? (isUpdate ? undefined : Prisma.JsonNull) as any,
      tags: dto.tags ?? (isUpdate ? undefined : Prisma.JsonNull) as any,
      teachingYears: dto.teachingYears,
      mentorExperience: dto.mentorExperience,
      workHistory: dto.workHistory,
      honors: dto.honors,
      hourlyRate: dto.hourlyRate,
      trialRate: dto.trialRate,
      minHours: dto.minHours ?? (isUpdate ? undefined : 1),
      status: dto.status,
      isCertified: dto.isCertified,
      sortWeight: dto.sortWeight,
      realName: dto.realName,
      addressDetail: dto.addressDetail,
      latitude: dto.latitude,
      longitude: dto.longitude,
    };
    // 当 status 改为 APPROVED 时同步打上 approvedAt
    if (dto.status === TeacherStatus.APPROVED) {
      (data as any).approvedAt = new Date();
    }
    return data;
  }

  private async upsertChildren(tx: Prisma.TransactionClient, teacherId: number, dto: AdminUpsertTeacherDto) {
    if (dto.educations) {
      await tx.teacherEducation.deleteMany({ where: { teacherId } });
      if (dto.educations.length > 0) {
        await tx.teacherEducation.createMany({
          data: dto.educations.map((e, idx) => ({
            teacherId,
            universityId: e.universityId,
            degree: e.degree,
            major: e.major,
            startYear: e.startYear,
            endYear: e.endYear,
            sort: idx,
          })),
        });
      }
    }
    if (dto.subjects) {
      const oldTs = await tx.teacherSubject.findMany({ where: { teacherId }, select: { id: true } });
      if (oldTs.length > 0) {
        await tx.teacherSubjectCurriculum.deleteMany({
          where: { teacherSubjectId: { in: oldTs.map((x) => x.id) } },
        });
        await tx.teacherSubject.deleteMany({ where: { teacherId } });
      }
      for (const s of dto.subjects) {
        const ts = await tx.teacherSubject.create({
          data: { teacherId, subjectId: s.subjectId, note: s.note },
        });
        if (s.curriculumIds.length > 0) {
          await tx.teacherSubjectCurriculum.createMany({
            data: s.curriculumIds.map((cid) => ({ teacherSubjectId: ts.id, curriculumId: cid })),
          });
        }
      }
    }
  }
}
