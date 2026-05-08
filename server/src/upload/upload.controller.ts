import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ConfigService } from '@nestjs/config';
import { mkdirSync } from 'fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BusinessException } from '../common/exceptions/business.exception';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly config: ConfigService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (_req, file, cb) => {
        if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)) {
          return cb(new BusinessException('仅支持 PNG/JPG/WEBP/GIF'), false);
        }
        cb(null, true);
      },
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          mkdirSync(UPLOAD_DIR, { recursive: true });
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const random = Math.random().toString(36).slice(2, 10);
          cb(null, `${Date.now()}_${random}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BusinessException('未收到文件');
    const baseUrl = this.config.get<string>('UPLOAD_BASE_URL') || 'http://localhost:3000/uploads';
    return {
      url: `${baseUrl.replace(/\/$/, '')}/${file.filename}`,
      filename: file.filename,
      size: file.size,
    };
  }
}
