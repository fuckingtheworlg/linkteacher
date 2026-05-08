import { Controller, Get, Query } from '@nestjs/common';
import { BannerPosition } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('banners')
export class BannersController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  list(@Query('position') position?: string) {
    const pos = position && position in BannerPosition ? (position as BannerPosition) : BannerPosition.HOME_TOP;
    return this.prisma.banner.findMany({
      where: { active: true, position: pos },
      orderBy: [{ sort: 'asc' }, { id: 'desc' }],
      select: {
        id: true,
        title: true,
        subtitle: true,
        imageUrl: true,
        link: true,
        position: true,
      },
    });
  }
}
