import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsInt, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { Audience } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

class LogMatchDto {
  @IsString() @MaxLength(64) sessionFrom!: string;
  @IsOptional() @IsInt() teacherId?: number;
  @IsOptional() @IsObject() meta?: Record<string, unknown>;
}

@UseGuards(JwtAuthGuard)
@Audience('wx')
@Controller('match')
export class MatchController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('log')
  async log(@CurrentUser() u: JwtPayload, @Body() dto: LogMatchDto) {
    await this.prisma.matchLog.create({
      data: {
        userId: u.sub,
        teacherId: dto.teacherId,
        sessionFrom: dto.sessionFrom,
        meta: dto.meta as never,
      },
    });
    return { ok: true };
  }
}
