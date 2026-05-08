import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Prisma connected to database');
    } catch (err) {
      // 开发环境允许 DB 暂未就绪而启动（便于无 DB 的纯 health-check / 静态资源调试）
      // 生产环境强制连接成功，避免静默降级带来的运维隐患
      const isProd = process.env.NODE_ENV === 'production';
      this.logger.error(
        `Prisma failed to connect (${isProd ? 'fatal' : 'continuing in dev mode'})`,
        err instanceof Error ? err.stack : err,
      );
      if (isProd) throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
