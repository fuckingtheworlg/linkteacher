import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DegreeType, Gender } from '@prisma/client';

class EducationItem {
  // universityId 与 customUniversityName 二选一
  @IsOptional() @IsInt() universityId?: number;
  @IsOptional() @IsString() @MaxLength(128) customUniversityName?: string;
  @IsEnum(DegreeType) degree!: DegreeType;
  @IsString() @MaxLength(128) major!: string;
  @IsOptional() @IsInt() startYear?: number;
  @IsOptional() @IsInt() endYear?: number;
  @IsOptional() @IsInt() sort?: number;
}

class SubjectItem {
  @IsInt() subjectId!: number;
  @IsArray() @IsInt({ each: true }) curriculumIds!: number[];
  @IsOptional() @IsString() @MaxLength(255) note?: string;
}

export class UpsertTeacherDto {
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsString() @MaxLength(64) country?: string;
  @IsOptional() @IsString() @MaxLength(64) city?: string;

  @IsOptional() @IsArray() headlines?: string[];
  @IsOptional() @IsArray() languages?: string[];
  @IsOptional() @IsArray() tags?: string[];

  @IsOptional() @IsInt() @Min(0) @Max(80) teachingYears?: number;
  @IsOptional() @IsString() mentorExperience?: string;
  @IsOptional() @IsString() workHistory?: string;
  @IsOptional() @IsString() honors?: string;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(99999) hourlyRate?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(99999) trialRate?: number;
  @IsOptional() @IsInt() @Min(1) @Max(24) minHours?: number;

  @IsOptional() @IsString() @MaxLength(8) mbti?: string;
  @IsOptional() @IsString() @MaxLength(255) address?: string;
  @IsOptional() @IsString() @MaxLength(64) nickname?: string;
  @IsOptional() @IsString() avatarUrl?: string;

  // ===== 简历（PDF 由 /api/upload/resume 上传后回写到这里）=====
  @IsOptional() @IsString() @MaxLength(512) resumeUrl?: string;
  @IsOptional() @IsString() @MaxLength(255) resumeFilename?: string;
  @IsOptional() resumeAllowDisplay?: boolean;

  // ===== 身份认证 =====
  @IsOptional() @IsString() @MaxLength(64) realName?: string;
  @IsOptional() @IsString() @MaxLength(512) idCardFrontUrl?: string;
  @IsOptional() @IsString() @MaxLength(512) idCardBackUrl?: string;

  // ===== 地址定位 =====
  @IsOptional() @IsString() @MaxLength(255) addressDetail?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => EducationItem)
  educations?: EducationItem[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SubjectItem)
  subjects?: SubjectItem[];
}
