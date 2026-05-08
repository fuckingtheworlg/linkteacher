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
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AdminRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audience, Roles } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';

class CreateAdminDto {
  @IsString() @MinLength(3) @MaxLength(64) username!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() @MaxLength(64) name!: string;
  @IsEnum(AdminRole) role!: AdminRole;
}

class UpdateAdminDto {
  @IsOptional() @IsString() @MaxLength(64) name?: string;
  @IsOptional() @IsEnum(AdminRole) role?: AdminRole;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() @MinLength(8) newPassword?: string;
}

@UseGuards(JwtAuthGuard)
@Audience('admin')
@Roles('SUPER_ADMIN')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    return this.prisma.adminUser.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        mustChangePwd: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  @Post()
  async create(@Body() dto: CreateAdminDto) {
    const exists = await this.prisma.adminUser.findUnique({ where: { username: dto.username } });
    if (exists) throw new BusinessException('账号已存在');
    const hash = await bcrypt.hash(dto.password, 10);
    return this.prisma.adminUser.create({
      data: {
        username: dto.username,
        passwordHash: hash,
        name: dto.name,
        role: dto.role,
        mustChangePwd: true,
      },
      select: { id: true, username: true, name: true, role: true, active: true },
    });
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAdminDto) {
    const exists = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!exists) throw new BusinessException('管理员不存在', 404);
    const data: import('@prisma/client').Prisma.AdminUserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.newPassword) {
      data.passwordHash = await bcrypt.hash(dto.newPassword, 10);
      data.mustChangePwd = true;
    }
    return this.prisma.adminUser.update({
      where: { id },
      data,
      select: { id: true, username: true, name: true, role: true, active: true },
    });
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const all = await this.prisma.adminUser.findMany({ where: { active: true } });
    if (all.length <= 1) throw new BusinessException('系统至少需保留 1 个管理员账号');
    await this.prisma.adminUser.delete({ where: { id } });
    return { ok: true };
  }
}
