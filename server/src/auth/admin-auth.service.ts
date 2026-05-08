import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly _config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  async login(username: string, password: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { username } });
    if (!admin || !admin.active) {
      throw new BusinessException('账号或密码错误', 401);
    }
    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) throw new BusinessException('账号或密码错误', 401);

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await this.jwt.signAsync({
      sub: admin.id,
      audience: 'admin',
      role: admin.role,
      username: admin.username,
    });

    return {
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role,
        mustChangePwd: admin.mustChangePwd,
      },
    };
  }

  async changePassword(adminId: number, oldPwd: string, newPwd: string) {
    if (!newPwd || newPwd.length < 8) {
      throw new BusinessException('新密码至少 8 位');
    }
    const admin = await this.prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!admin) throw new BusinessException('管理员不存在', 404);
    const ok = await bcrypt.compare(oldPwd, admin.passwordHash);
    if (!ok) throw new BusinessException('原密码错误');
    const hash = await bcrypt.hash(newPwd, 10);
    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: { passwordHash: hash, mustChangePwd: false },
    });
    return { ok: true };
  }
}
