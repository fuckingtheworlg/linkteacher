import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audience, Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

class UpsertConfigDto {
  @IsString() value!: string;
  @IsOptional() @IsString() @MaxLength(255) desc?: string;
}

/**
 * 系统配置：key/value 模式，value 为 JSON 字符串
 *
 * 已知 key：
 *   - official-account：{ name, desc, qrcodeUrl, sameSubject, mpAppId }
 *
 * 路由分公私两套：
 *   - GET  /api/configs/:key            公共读取（小程序拉取）
 *   - PUT  /api/admin/configs/:key      管理员写入
 */
@Controller()
export class SystemConfigController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('configs/:key')
  async publicGet(@Param('key') key: string) {
    const c = await this.prisma.systemConfig.findUnique({ where: { key } });
    if (!c) return { key, value: '', exists: false };
    return { key: c.key, value: c.value, exists: true, updatedAt: c.updatedAt };
  }

  @UseGuards(JwtAuthGuard)
  @Audience('admin')
  @Get('admin/configs')
  listAll() {
    return this.prisma.systemConfig.findMany({ orderBy: { key: 'asc' } });
  }

  @UseGuards(JwtAuthGuard)
  @Audience('admin')
  @Get('admin/configs/:key')
  adminGet(@Param('key') key: string) {
    return this.prisma.systemConfig.findUnique({ where: { key } });
  }

  @UseGuards(JwtAuthGuard)
  @Audience('admin')
  @Put('admin/configs/:key')
  async upsert(@Param('key') key: string, @Body() dto: UpsertConfigDto) {
    return this.prisma.systemConfig.upsert({
      where: { key },
      update: { value: dto.value, desc: dto.desc },
      create: { key, value: dto.value, desc: dto.desc },
    });
  }
}
