import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ApiResponse<T> {
  code: 0;
  data: T;
  message: 'ok';
}

/**
 * 统一返回体：{ code: 0, data, message: 'ok' }；异常走 AllExceptionsFilter。
 * 不在拦截器里吞错误，所有错误都让 Filter 处理。
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_ctx: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(map((data) => ({ code: 0, data, message: 'ok' }) as const));
  }
}
