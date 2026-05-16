import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audience } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

class ListMatchLogsDto {
  @IsOptional() @IsString() sessionFrom?: string;
  @IsOptional() @IsString() since?: string; // ISO date
  @IsOptional() @IsString() until?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number;
}

@UseGuards(JwtAuthGuard)
@Audience('admin')
@Controller('admin/match-logs')
export class AdminMatchLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() q: ListMatchLogsDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where: Prisma.MatchLogWhereInput = {};
    if (q.sessionFrom) where.sessionFrom = { contains: q.sessionFrom };
    if (q.since || q.until) {
      where.createdAt = {};
      if (q.since) where.createdAt.gte = new Date(q.since);
      if (q.until) where.createdAt.lte = new Date(q.until);
    }
    const [total, list, byEntry] = await this.prisma.$transaction([
      this.prisma.matchLog.count({ where }),
      this.prisma.matchLog.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, nickname: true, openid: true } },
          teacher: {
            select: { id: true, user: { select: { nickname: true } } },
          },
        },
      }),
      this.prisma.matchLog.groupBy({
        by: ['sessionFrom'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);
    return {
      page,
      pageSize,
      total,
      list,
      byEntry: byEntry.map((b) => ({
        sessionFrom: b.sessionFrom,
        count: (b._count as { id: number })?.id ?? 0,
      })),
    };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.prisma.matchLog.delete({ where: { id } });
    return { ok: true };
  }
}
