import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length } from 'class-validator';
import { UPLOAD_PURPOSES, type UploadPurpose } from '../../../common/domain/enums.js';

export class UploadRequestDto {
  @ApiProperty({ enum: UPLOAD_PURPOSES })
  @IsIn(UPLOAD_PURPOSES)
  purpose: UploadPurpose;

  /**
   * Documents the multipart part for Swagger. Multer hands the file to @UploadedFile(), not the body, but class
   * fields still create the property, so it needs a validator or forbidNonWhitelisted rejects every upload.
   */
  @ApiProperty({ type: 'string', format: 'binary' })
  @IsOptional()
  file?: unknown;
}

export class UploadResponseDto {
  /** The image/file ID. Reference it when submitting a scan (photoKey), an invoice (documentKey) or a profile/shop photo. */
  key: string;
  /** Signed link to view the file, relative to the API origin. */
  url: string;
  contentType: string;
  sizeBytes: number;
}

/** Query of a signed file link (see file-url.ts). */
export class FileLinkQueryDto {
  @Type(() => Number)
  @IsInt()
  exp: number;

  @IsString()
  @Length(32, 32)
  sig: string;
}
