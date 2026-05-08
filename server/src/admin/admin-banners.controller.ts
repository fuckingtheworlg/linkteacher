import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { BannerPosition } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audience } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';

class UpsertBannerDto {
  @IsString() @MaxLength(64) title!: string;
  @IsOptional() @IsString() @MaxLength(128) subtitle?: string;
  @IsOptional() @IsString() @MaxLength(512) imageUrl?: string;
  @IsOptional() @IsString() @MaxLength(512) link?: string;
  @IsOptional() @IsEnum(BannerPosition) position?: BannerPosition;
  @IsOptional() @IsInt() sort?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

@UseGuards(JwtAuthGuard)
@Audience('admin')
@Controller('admin/banners')
export class AdminBannersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.banner.findMany({
      orderBy: [{ position: 'asc' }, { sort: 'asc' }, { id: 'desc' }],
    });
  }

  @Post()
  create(@Body() dto: UpsertBannerDto) {
    return this.prisma.banner.create({ data: dto });
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpsertBannerDto) {
    const exists = await this.prisma.banner.findUnique({ where: { id } });
    if (!exists) throw new BusinessException('Banner 不存在', 404);
    return this.prisma.banner.update({ where: { id }, data: dto });
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.prisma.banner.delete({ where: { id } });
    return { ok: true };
  }
}
