import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('dict')
export class DictController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('subjects')
  subjects() {
    return this.prisma.subject.findMany({
      where: { active: true },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
      select: { id: true, code: true, name: true, sort: true },
    });
  }

  @Public()
  @Get('curriculums')
  curriculums() {
    return this.prisma.curriculum.findMany({
      where: { active: true },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
      select: { id: true, code: true, name: true, sort: true },
    });
  }

  @Public()
  @Get('universities')
  async universities(@Query('keyword') keyword?: string, @Query('country') country?: string) {
    return this.prisma.university.findMany({
      where: {
        active: true,
        AND: [
          country ? { country } : {},
          keyword
            ? {
                OR: [
                  { nameZh: { contains: keyword } },
                  { nameEn: { contains: keyword } },
                ],
              }
            : {},
        ],
      },
      orderBy: [{ sortWeight: 'desc' }, { qsRank: 'asc' }, { id: 'asc' }],
      take: 50,
      select: {
        id: true,
        nameZh: true,
        nameEn: true,
        country: true,
        city: true,
        qsRank: true,
        qsYear: true,
        logoUrl: true,
      },
    });
  }
}
