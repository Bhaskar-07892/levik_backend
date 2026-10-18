import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { UPLOAD_PURPOSES, type UploadPurpose } from '../../../common/domain/enums.js';

export class UploadRequestDto {
  @ApiProperty({ enum: UPLOAD_PURPOSES })
  @IsIn(UPLOAD_PURPOSES)
  purpose: UploadPurpose;

  @ApiProperty({ type: 'string', format: 'binary' })
  file: unknown;
}

export class UploadResponseDto {
  /** Reference this key when submitting a scan (photoKey) or invoice (documentKey). */
  key: string;
  contentType: string;
  sizeBytes: number;
}
