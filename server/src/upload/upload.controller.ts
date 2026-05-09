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

function makeStorage() {
  return diskStorage({
    destination: (_req, _file, cb) => {
      mkdirSync(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const random = Math.random().toString(36).slice(2, 10);
      // multer@2 默认对 originalname 做 latin1 → utf8 转换会丢中文，做兜底
      cb(null, `${Date.now()}_${random}${extname(file.originalname || '')}`);
    },
  });
}

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly config: ConfigService) {}

  private buildUrl(filename: string) {
    const baseUrl = this.config.get<string>('UPLOAD_BASE_URL') || 'http://localhost:3000/uploads';
    return `${baseUrl.replace(/\/$/, '')}/${filename}`;
  }

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
      storage: makeStorage(),
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BusinessException('未收到文件');
    return {
      url: this.buildUrl(file.filename),
      filename: file.filename,
      size: file.size,
    };
  }

  @Post('resume')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (_req, file, cb) => {
        // 微信 chooseMessageFile 上传 PDF 时 mimetype 多为 application/pdf；
        // 但部分客户端会传 application/octet-stream，故同时按扩展名兜底
        const ext = extname(file.originalname || '').toLowerCase();
        if (file.mimetype !== 'application/pdf' && ext !== '.pdf') {
          return cb(new BusinessException('仅支持 PDF 格式'), false);
        }
        cb(null, true);
      },
      storage: makeStorage(),
    }),
  )
  uploadResume(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BusinessException('未收到文件');
    return {
      url: this.buildUrl(file.filename),
      filename: file.filename,
      // 把客户端原始文件名也回传（便于在前端显示），但不暴露真实 ID
      originalFilename: file.originalname,
      size: file.size,
    };
  }
}
