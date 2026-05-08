import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { AdminAuthService } from './admin-auth.service';
import { Audience, Public } from '../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

class AdminLoginDto {
  @IsString()
  username!: string;
  @IsString()
  @MinLength(6)
  password!: string;
}

class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  oldPassword!: string;
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly svc: AdminAuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: AdminLoginDto) {
    return this.svc.login(dto.username, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Audience('admin')
  @Post('change-password')
  changePwd(@Body() dto: ChangePasswordDto, @CurrentUser() user: JwtPayload) {
    return this.svc.changePassword(user.sub, dto.oldPassword, dto.newPassword);
  }
}
