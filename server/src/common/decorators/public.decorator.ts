import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const AUDIENCE_KEY = 'audience';
export const Audience = (audience: 'wx' | 'admin') => SetMetadata(AUDIENCE_KEY, audience);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
