import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audience } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';

class VerifyEducationDto {
  @IsBoolean() approve!: boolean;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

/**
 * 学历认证：独立于 Teacher 总状态机的子审核
 *  - PENDING  → VERIFIED      通过
 *  - PENDING  → REJECTED      驳回（必填 reason）
 *  - VERIFIED → PENDING       重置
 *  - REJECTED → PENDING       重置（老师修改资料后会自动重置，由 service.upsertMe 处理）
 */
@UseGuards(JwtAuthGuard)
@Audience('admin')
@Controller('admin/educations')
export class AdminEducationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post(':id/verify')
  async verify(@Param('id', ParseIntPipe) id: number, @Body() dto: VerifyEducationDto) {
    const edu = await this.prisma.teacherEducation.findUnique({ where: { id } });
    if (!edu) throw new BusinessException('学历不存在', 404);
    if (!dto.approve && !dto.reason) throw new BusinessException('驳回必须填写原因');

    return this.prisma.teacherEducation.update({
      where: { id },
      data: dto.approve
        ? {
            verifiedStatus: 'VERIFIED',
            verifiedAt: new Date(),
            verifyRejectReason: null,
          }
        : {
            verifiedStatus: 'REJECTED',
            verifiedAt: new Date(),
            verifyRejectReason: dto.reason,
          },
      select: {
        id: true,
        verifiedStatus: true,
        verifiedAt: true,
        verifyRejectReason: true,
      },
    });
  }

  @Post(':id/reset')
  async reset(@Param('id', ParseIntPipe) id: number) {
    const edu = await this.prisma.teacherEducation.findUnique({ where: { id } });
    if (!edu) throw new BusinessException('学历不存在', 404);
    return this.prisma.teacherEducation.update({
      where: { id },
      data: {
        verifiedStatus: 'PENDING',
        verifiedAt: null,
        verifyRejectReason: null,
      },
    });
  }
}
