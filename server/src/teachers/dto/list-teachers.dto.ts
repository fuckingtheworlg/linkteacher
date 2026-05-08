import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListTeachersDto {
  @IsOptional() @IsString()
  keyword?: string;

  @IsOptional() @Type(() => Number) @IsInt()
  subjectId?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  curriculumId?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  minRate?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  maxRate?: number;

  @IsOptional() @IsString()
  sort?: 'rate-asc' | 'rate-desc' | 'newest' | 'smart';

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  pageSize?: number;
}
