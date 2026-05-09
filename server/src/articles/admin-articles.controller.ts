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
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audience } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';

class UpsertArticleDto {
  @IsString() @MaxLength(64) slug!: string;
  @IsString() @MaxLength(128) title!: string;
  @IsString() content!: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

@UseGuards(JwtAuthGuard)
@Audience('admin')
@Controller('admin/articles')
export class AdminArticlesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.articleContent.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, slug: true, title: true, active: true, updatedAt: true },
    });
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const a = await this.prisma.articleContent.findUnique({ where: { id } });
    if (!a) throw new BusinessException('文章不存在', 404);
    return a;
  }

  @Post()
  async create(@Body() dto: UpsertArticleDto) {
    const exists = await this.prisma.articleContent.findUnique({ where: { slug: dto.slug } });
    if (exists) throw new BusinessException(`slug "${dto.slug}" 已存在`);
    return this.prisma.articleContent.create({ data: dto });
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpsertArticleDto) {
    const a = await this.prisma.articleContent.findUnique({ where: { id } });
    if (!a) throw new BusinessException('文章不存在', 404);
    if (dto.slug !== a.slug) {
      const conflict = await this.prisma.articleContent.findUnique({ where: { slug: dto.slug } });
      if (conflict) throw new BusinessException(`slug "${dto.slug}" 已被占用`);
    }
    return this.prisma.articleContent.update({ where: { id }, data: dto });
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.prisma.articleContent.delete({ where: { id } });
    return { ok: true };
  }
}
