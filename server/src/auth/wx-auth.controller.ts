import { Body, Controller, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import { WxAuthService } from './wx-auth.service';
import { Public } from '../common/decorators/public.decorator';

class WxLoginDto {
  @IsString()
  code!: string;
}

@Controller('wx')
export class WxAuthController {
  constructor(private readonly svc: WxAuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: WxLoginDto) {
    return this.svc.loginByCode(dto.code);
  }
}
