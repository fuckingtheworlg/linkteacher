import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Prisma, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audience } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';

class ListEndUsersDto {
  @IsOptional() @IsString() keyword?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number;
}

class UpdateEndUserDto {
  @IsOptional() @IsString() @MaxLength(64) nickname?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsBoolean() banned?: boolean;
  @IsOptional() @IsString() @MaxLength(255) bannedReason?: string;
}

/**
 * 「学生用户」管理（小程序 wx.login 进来的最终用户）
 * 与 AdminUser（后台账号）严格区分
 */
@UseGuards(JwtAuthGuard)
@Audience('admin')
@Controller('admin/end-users')
export class AdminEndUsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() q: ListEndUsersDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where: Prisma.UserWhereInput = {};
    if (q.role) where.role = q.role;
    if (q.keyword) {
      where.OR = [
        { nickname: { contains: q.keyword } },
        { openid: { contains: q.keyword } },
        { phone: { contains: q.keyword } },
      ];
    }
    const [total, list] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          openid: true,
          unionid: true,
          role: true,
          nickname: true,
          avatarUrl: true,
          mbti: true,
          phone: true,
          banned: true,
          bannedReason: true,
          createdAt: true,
          updatedAt: true,
          teacher: { select: { id: true, status: true } },
          _count: { select: { favorites: true, matchLogs: true } },
        },
      }),
    ]);
    return { page, pageSize, total, list };
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEndUserDto) {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new BusinessException('用户不存在', 404);
    if (dto.banned && !dto.bannedReason) {
      throw new BusinessException('封禁必须填写原因');
    }
    return this.prisma.user.update({
      where: { id },
      data: {
        nickname: dto.nickname,
        role: dto.role,
        banned: dto.banned,
        bannedReason: dto.banned === false ? null : dto.bannedReason,
      },
      select: { id: true, nickname: true, role: true, banned: true, bannedReason: true },
    });
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const u = await this.prisma.user.findUnique({ where: { id }, include: { teacher: true } });
    if (!u) throw new BusinessException('用户不存在', 404);
    // schema 中 Teacher.user 配了 onDelete:Cascade，删 user 会级联清空 teacher/favorites
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }
}
