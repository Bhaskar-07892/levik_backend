import { Body, Controller, Get, Param, Post, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { AppException, ErrorCode } from '../../../common/errors/app.exception.js';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface.js';
import { UploadRequestDto, UploadResponseDto } from '../dto/upload.dto.js';
import { UploadsService, type UploadedFileInput } from '../services/uploads.service.js';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // hard cap; the configured UPLOAD_MAX_MB is enforced in the service

@ApiTags('Uploads')
@ApiBearerAuth()
@Roles('admin', 'plumber', 'retailer', 'guest')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  save(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UploadRequestDto,
    @UploadedFile() file?: UploadedFileInput,
  ): Promise<UploadResponseDto> {
    const allowed =
      user.role === 'admin'
        ? ['product-image']
        : user.role === 'plumber'
          ? ['scan-photo', 'profile-photo']
          : user.role === 'retailer'
            ? ['invoice-document', 'profile-photo', 'shop-photo', 'gst-certificate']
            : ['profile-photo', 'shop-photo', 'gst-certificate']; // guest: onboarding documents before registering
    if (!allowed.includes(body.purpose)) {
      throw AppException.rule(ErrorCode.FORBIDDEN, `Your account cannot upload ${body.purpose} files.`);
    }
    return this.uploads.save(user, body.purpose, file);
  }

  /** Admins can open any file; participants only their own. */
  @Get(':key')
  async open(@CurrentUser() user: AuthenticatedUser, @Param('key') key: string): Promise<StreamableFile> {
    const { stream, contentType } = await this.uploads.open(key, user);
    return new StreamableFile(stream, { type: contentType, disposition: 'inline' });
  }
}
