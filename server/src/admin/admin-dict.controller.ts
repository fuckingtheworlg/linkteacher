import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audience } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';

class UpsertSubjectDto {
  @IsString() @MaxLength(32) code!: string;
  @IsString() @MaxLength(32) name!: string;
  @IsOptional() @IsInt() sort?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

class UpsertCurriculumDto {
  @IsString() @MaxLength(64) code!: string;
  @IsString() @MaxLength(64) name!: string;
  @IsOptional() @IsInt() sort?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

class UpsertUniversityDto {
  @IsString() @MaxLength(128) nameZh!: string;
  @IsString() @MaxLength(128) nameEn!: string;
  @IsString() @MaxLength(64) country!: string;
  @IsOptional() @IsString() @MaxLength(64) city?: string;
  @IsOptional() @IsInt() @Min(1) qsRank?: number;
  @IsOptional() @IsInt() qsYear?: number;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsInt() sortWeight?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

@UseGuards(JwtAuthGuard)
@Audience('admin')
@Controller('admin')
export class AdminDictController {
  constructor(private readonly prisma: PrismaService) {}

  // ========== Subject ==========
  @Get('subjects')
  listSubjects() {
    return this.prisma.subject.findMany({ orderBy: [{ sort: 'asc' }, { id: 'asc' }] });
  }

  @Post('subjects')
  createSubject(@Body() dto: UpsertSubjectDto) {
    return this.prisma.subject.create({ data: dto });
  }

  @Put('subjects/:id')
  async updateSubject(@Param('id', ParseIntPipe) id: number, @Body() dto: UpsertSubjectDto) {
    const exists = await this.prisma.subject.findUnique({ where: { id } });
    if (!exists) throw new BusinessException('科目不存在', 404);
    return this.prisma.subject.update({ where: { id }, data: dto });
  }

  @Delete('subjects/:id')
  async removeSubject(@Param('id', ParseIntPipe) id: number) {
    const used = await this.prisma.teacherSubject.count({ where: { subjectId: id } });
    if (used > 0) throw new BusinessException(`已被 ${used} 位老师使用，不可删除（可改为 active=false）`);
    await this.prisma.subject.delete({ where: { id } });
    return { ok: true };
  }

  // ========== Curriculum ==========
  @Get('curriculums')
  listCurriculums() {
    return this.prisma.curriculum.findMany({ orderBy: [{ sort: 'asc' }, { id: 'asc' }] });
  }

  @Post('curriculums')
  createCurriculum(@Body() dto: UpsertCurriculumDto) {
    return this.prisma.curriculum.create({ data: dto });
  }

  @Put('curriculums/:id')
  async updateCurriculum(@Param('id', ParseIntPipe) id: number, @Body() dto: UpsertCurriculumDto) {
    const exists = await this.prisma.curriculum.findUnique({ where: { id } });
    if (!exists) throw new BusinessException('课程体系不存在', 404);
    return this.prisma.curriculum.update({ where: { id }, data: dto });
  }

  @Delete('curriculums/:id')
  async removeCurriculum(@Param('id', ParseIntPipe) id: number) {
    const used = await this.prisma.teacherSubjectCurriculum.count({ where: { curriculumId: id } });
    if (used > 0) throw new BusinessException(`已被 ${used} 处使用，不可删除`);
    await this.prisma.curriculum.delete({ where: { id } });
    return { ok: true };
  }

  // ========== University ==========
  @Get('universities')
  async listUniversities(
    @Query('keyword') keyword?: string,
    @Query('country') country?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    const p = parseInt(page, 10);
    const ps = parseInt(pageSize, 10);
    const where: import('@prisma/client').Prisma.UniversityWhereInput = {};
    if (country) where.country = country;
    if (keyword) {
      where.OR = [
        { nameZh: { contains: keyword } },
        { nameEn: { contains: keyword } },
      ];
    }
    const [total, list] = await this.prisma.$transaction([
      this.prisma.university.count({ where }),
      this.prisma.university.findMany({
        where,
        orderBy: [{ qsRank: 'asc' }, { id: 'asc' }],
        skip: (p - 1) * ps,
        take: ps,
      }),
    ]);
    return { page: p, pageSize: ps, total, list };
  }

  @Post('universities')
  createUniversity(@Body() dto: UpsertUniversityDto) {
    return this.prisma.university.create({ data: dto });
  }

  @Put('universities/:id')
  async updateUniversity(@Param('id', ParseIntPipe) id: number, @Body() dto: UpsertUniversityDto) {
    const exists = await this.prisma.university.findUnique({ where: { id } });
    if (!exists) throw new BusinessException('大学不存在', 404);
    return this.prisma.university.update({ where: { id }, data: dto });
  }

  @Delete('universities/:id')
  async removeUniversity(@Param('id', ParseIntPipe) id: number) {
    const used = await this.prisma.teacherEducation.count({ where: { universityId: id } });
    if (used > 0) throw new BusinessException(`已被 ${used} 段学历背景引用，不可删除（建议改为 active=false）`);
    await this.prisma.university.delete({ where: { id } });
    return { ok: true };
  }
}
