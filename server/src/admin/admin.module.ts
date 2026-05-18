import { Module } from '@nestjs/common';
import { AdminTeachersController } from './admin-teachers.controller';
import { AdminDictController } from './admin-dict.controller';
import { AdminBannersController } from './admin-banners.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminEndUsersController } from './admin-end-users.controller';
import { AdminMatchLogsController } from './admin-match-logs.controller';
import { AdminEducationsController } from './admin-educations.controller';

@Module({
  controllers: [
    AdminTeachersController,
    AdminDictController,
    AdminBannersController,
    AdminUsersController,
    AdminEndUsersController,
    AdminMatchLogsController,
    AdminEducationsController,
  ],
})
export class AdminModule {}
