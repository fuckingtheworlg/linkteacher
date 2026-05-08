import { Injectable } from '@nestjs/common';
import { Prisma, TeacherStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListTeachersDto } from './dto/list-teachers.dto';
import { UpsertTeacherDto } from './dto/upsert-teacher.dto';
import { BusinessException } from '../common/exceptions/business.exception';

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  // ============= 学生端：列表 =============
  async listPublic(query: ListTeachersDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 20));

    const where: Prisma.TeacherWhereInput = {
      status: TeacherStatus.APPROVED,
    };

    if (query.minRate !== undefined || query.maxRate !== undefined) {
      where.hourlyRate = {};
      if (query.minRate !== undefined) where.hourlyRate.gte = query.minRate;
      if (query.maxRate !== undefined) where.hourlyRate.lte = query.maxRate;
    }

    if (query.subjectId || query.curriculumId) {
      where.subjects = {
        some: {
          ...(query.subjectId ? { subjectId: query.subjectId } : {}),
          ...(query.curriculumId
            ? { curriculums: { some: { curriculumId: query.curriculumId } } }
            : {}),
        },
      };
    }

    if (query.keyword) {
      where.OR = [
        { user: { nickname: { contains: query.keyword } } },
        { user: { address: { contains: query.keyword } } },
      ];
    }

    let orderBy: Prisma.TeacherOrderByWithRelationInput[] = [
      { sortWeight: 'desc' },
      { approvedAt: 'desc' },
    ];
    if (query.sort === 'rate-asc') orderBy = [{ hourlyRate: 'asc' }, { id: 'asc' }];
    else if (query.sort === 'rate-desc') orderBy = [{ hourlyRate: 'desc' }, { id: 'asc' }];
    else if (query.sort === 'newest') orderBy = [{ approvedAt: 'desc' }];

    const [total, list] = await this.prisma.$transaction([
      this.prisma.teacher.count({ where }),
      this.prisma.teacher.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          gender: true,
          country: true,
          city: true,
          headlines: true,
          languages: true,
          tags: true,
          hourlyRate: true,
          trialRate: true,
          isCertified: true,
          user: { select: { nickname: true, avatarUrl: true } },
          educations: {
            orderBy: { sort: 'asc' },
            take: 1,
            select: { university: { select: { nameZh: true, nameEn: true, qsRank: true } }, major: true },
          },
          subjects: {
            select: {
              subject: { select: { name: true, code: true } },
              curriculums: { select: { curriculum: { select: { name: true } } } },
            },
          },
        },
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      list,
    };
  }

  // ============= 学生端：详情 =============
  async detailPublic(id: number) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, status: TeacherStatus.APPROVED },
      include: {
        user: { select: { nickname: true, avatarUrl: true, mbti: true, address: true } },
        educations: {
          orderBy: { sort: 'asc' },
          include: { university: true },
        },
        subjects: {
          include: {
            subject: true,
            curriculums: { include: { curriculum: true } },
          },
        },
      },
    });
    if (!teacher) throw new BusinessException('老师不存在或未上架', 404);
    return teacher;
  }

  // ============= 导师端 me =============
  async getMe(userId: number) {
    return this.prisma.teacher.findUnique({
      where: { userId },
      include: {
        user: true,
        educations: { orderBy: { sort: 'asc' }, include: { university: true } },
        subjects: { include: { subject: true, curriculums: { include: { curriculum: true } } } },
      },
    });
  }

  // ============= 导师端：保存草稿（同时把 user 上的 nickname/mbti/address 一并更新） =============
  async upsertMe(userId: number, dto: UpsertTeacherDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. 同步更新 user 角色与个人卡片信息
      const userPatch: Prisma.UserUpdateInput = { role: UserRole.TEACHER };
      if (dto.nickname !== undefined) userPatch.nickname = dto.nickname;
      if (dto.avatarUrl !== undefined) userPatch.avatarUrl = dto.avatarUrl;
      if (dto.mbti !== undefined) userPatch.mbti = dto.mbti;
      if (dto.address !== undefined) userPatch.address = dto.address;
      await tx.user.update({ where: { id: userId }, data: userPatch });

      // 2. upsert teacher 主表（不动 status / submittedAt / approvedAt）
      const teacherData: Prisma.TeacherUpsertArgs['create'] = {
        userId,
        gender: dto.gender,
        country: dto.country,
        city: dto.city,
        headlines: dto.headlines ?? Prisma.JsonNull,
        languages: dto.languages ?? Prisma.JsonNull,
        tags: dto.tags ?? Prisma.JsonNull,
        teachingYears: dto.teachingYears,
        mentorExperience: dto.mentorExperience,
        workHistory: dto.workHistory,
        honors: dto.honors,
        hourlyRate: dto.hourlyRate,
        trialRate: dto.trialRate,
        minHours: dto.minHours ?? 1,
      };
      const updateData = { ...teacherData };
      delete (updateData as Partial<typeof teacherData>).userId;

      const teacher = await tx.teacher.upsert({
        where: { userId },
        create: teacherData,
        update: updateData,
      });

      // 3. 如果传了 educations，整组覆盖（草稿场景下用户每次提交一份完整版本）
      if (dto.educations) {
        await tx.teacherEducation.deleteMany({ where: { teacherId: teacher.id } });
        if (dto.educations.length > 0) {
          await tx.teacherEducation.createMany({
            data: dto.educations.map((e, idx) => ({
              teacherId: teacher.id,
              universityId: e.universityId,
              degree: e.degree,
              major: e.major,
              startYear: e.startYear,
              endYear: e.endYear,
              sort: e.sort ?? idx,
            })),
          });
        }
      }

      // 4. 同上：subjects + curriculums
      if (dto.subjects) {
        const oldTs = await tx.teacherSubject.findMany({
          where: { teacherId: teacher.id },
          select: { id: true },
        });
        if (oldTs.length > 0) {
          await tx.teacherSubjectCurriculum.deleteMany({
            where: { teacherSubjectId: { in: oldTs.map((t) => t.id) } },
          });
          await tx.teacherSubject.deleteMany({ where: { teacherId: teacher.id } });
        }
        for (const s of dto.subjects) {
          const ts = await tx.teacherSubject.create({
            data: { teacherId: teacher.id, subjectId: s.subjectId, note: s.note },
          });
          if (s.curriculumIds.length > 0) {
            await tx.teacherSubjectCurriculum.createMany({
              data: s.curriculumIds.map((cid) => ({
                teacherSubjectId: ts.id,
                curriculumId: cid,
              })),
            });
          }
        }
      }

      return teacher;
    });
  }

  // ============= 导师端：提交审核 =============
  async submitForAudit(userId: number) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId },
      include: { subjects: true, educations: true },
    });
    if (!teacher) throw new BusinessException('请先填写完整资料');

    // 必填校验：报价 + 至少 1 个学历 + 至少 1 个科目 + headlines
    const missing: string[] = [];
    if (!teacher.hourlyRate) missing.push('课时费');
    if (!teacher.trialRate) missing.push('试听价');
    if (!teacher.educations || teacher.educations.length === 0) missing.push('至少 1 段学历背景');
    if (!teacher.subjects || teacher.subjects.length === 0) missing.push('至少 1 个辅导科目');
    if (missing.length > 0) {
      throw new BusinessException(`资料不完整：${missing.join('、')}`);
    }

    if (teacher.status === TeacherStatus.PENDING) {
      throw new BusinessException('资料已提交审核，请耐心等待');
    }

    return this.prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        status: TeacherStatus.PENDING,
        submittedAt: new Date(),
        rejectReason: null,
      },
    });
  }
}
