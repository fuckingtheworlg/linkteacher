import { Module } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { PublicTeachersController } from './public-teachers.controller';
import { MeTeacherController } from './me-teacher.controller';

@Module({
  controllers: [PublicTeachersController, MeTeacherController],
  providers: [TeachersService],
  exports: [TeachersService],
})
export class TeachersModule {}
