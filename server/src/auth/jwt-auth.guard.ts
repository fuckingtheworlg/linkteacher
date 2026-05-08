import { ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { AUDIENCE_KEY, IS_PUBLIC_KEY, ROLES_KEY } from '../common/decorators/public.decorator';
import { JwtPayload } from '../common/decorators/current-user.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context) as boolean | Promise<boolean>;
  }

  handleRequest<TUser = JwtPayload>(err: unknown, user: TUser, _info: unknown, context: ExecutionContext): TUser {
    if (err || !user) {
      throw err instanceof Error ? err : new UnauthorizedException('未登录或登录已过期');
    }

    const expectedAudience = this.reflector.getAllAndOverride<'wx' | 'admin'>(AUDIENCE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const payload = user as unknown as JwtPayload;
    if (expectedAudience && payload.audience !== expectedAudience) {
      throw new ForbiddenException('身份不匹配，无权访问该接口');
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles && requiredRoles.length > 0) {
      if (!payload.role || !requiredRoles.includes(payload.role)) {
        throw new ForbiddenException(`角色不足，需要：${requiredRoles.join('/')}`);
      }
    }

    return user;
  }
}
