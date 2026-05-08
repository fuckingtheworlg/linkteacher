import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';

interface Code2SessionResp {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

@Injectable()
export class WxAuthService {
  private readonly logger = new Logger(WxAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  async loginByCode(code: string): Promise<{ token: string; user: { id: number; nickname: string | null; avatarUrl: string | null; role: string } }> {
    if (!code) throw new BusinessException('缺少 wx.login 返回的 code');

    const appid = this.config.get<string>('WX_APPID');
    const secret = this.config.get<string>('WX_SECRET');

    let openid: string;
    let unionid: string | undefined;

    // 占位 secret 模式：本地开发时无需真实 AppSecret 也能跑全链路（用 code 派生 mock openid）
    const isSecretPlaceholder = !secret || /please-fill|CHANGE_ME|do-not-commit/i.test(secret);
    if (!appid || appid === 'wx0000000000000000' || isSecretPlaceholder) {
      this.logger.warn('WX_SECRET 为占位/未配置，使用 mock openid（仅限开发环境，生产环境必须填真实值）');
      openid = `mock_${code}`;
    } else {
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`;
      const { data } = await axios.get<Code2SessionResp>(url, { timeout: 5000 });
      if (data.errcode || !data.openid) {
        this.logger.error(`code2Session failed: ${JSON.stringify(data)}`);
        throw new BusinessException(`微信登录失败：${data.errmsg || '未知错误'}`);
      }
      openid = data.openid;
      unionid = data.unionid;
    }

    const user = await this.prisma.user.upsert({
      where: { openid },
      update: { unionid: unionid ?? undefined },
      create: { openid, unionid, role: 'STUDENT' },
    });

    const token = await this.jwt.signAsync({
      sub: user.id,
      audience: 'wx',
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    };
  }
}
