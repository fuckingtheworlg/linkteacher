import { Controller, Get, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';
import { BusinessException } from '../common/exceptions/business.exception';

@Controller('articles')
export class ArticlesController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    const a = await this.prisma.articleContent.findFirst({
      where: { slug, active: true },
      select: { id: true, slug: true, title: true, content: true, updatedAt: true },
    });
    if (!a) throw new BusinessException('文章不存在或已下线', 404);
    return a;
  }
}
