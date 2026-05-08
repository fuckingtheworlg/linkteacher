import { Module } from '@nestjs/common';
import { AdminTeachersController } from './admin-teachers.controller';
import { AdminDictController } from './admin-dict.controller';
import { AdminBannersController } from './admin-banners.controller';
import { AdminUsersController } from './admin-users.controller';

@Module({
  controllers: [
    AdminTeachersController,
    AdminDictController,
    AdminBannersController,
    AdminUsersController,
  ],
})
export class AdminModule {}
