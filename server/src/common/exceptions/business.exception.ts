import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * 业务异常：用于明确的业务错误（参数校验、状态机非法等）。
 * 与 NestJS 内置 HttpException 区别：返回的 message 一定是面向终端可见的文案。
 */
export class BusinessException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST, code = 'BIZ_ERROR') {
    super({ statusCode: status, code, message }, status);
  }
}
