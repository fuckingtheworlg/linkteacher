import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DegreeType, Gender } from '@prisma/client';

class EducationItem {
  @IsInt() universityId!: number;
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

  @IsOptional() @IsInt() @Min(0) teachingYears?: number;
  @IsOptional() @IsString() mentorExperience?: string;
  @IsOptional() @IsString() workHistory?: string;
  @IsOptional() @IsString() honors?: string;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) hourlyRate?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) trialRate?: number;
  @IsOptional() @IsInt() @Min(1) minHours?: number;

  @IsOptional() @IsString() @MaxLength(8) mbti?: string;
  @IsOptional() @IsString() @MaxLength(255) address?: string;
  @IsOptional() @IsString() @MaxLength(64) nickname?: string;
  @IsOptional() @IsString() avatarUrl?: string;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => EducationItem)
  educations?: EducationItem[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SubjectItem)
  subjects?: SubjectItem[];
}
