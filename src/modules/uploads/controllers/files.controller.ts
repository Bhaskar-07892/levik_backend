import { Controller, Get, Param, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../../common/decorators/public.decorator.js';
import { AppException } from '../../../common/errors/app.exception.js';
import { FileLinkQueryDto } from '../dto/upload.dto.js';
import { verifyFileLink } from '../file-url.js';
import { UploadsService } from '../services/uploads.service.js';

/**
 * Opens a signed file link (`fileUrl(key)`) without an auth header, so `<Image>` / `<img>` can load it.
 * Bucket storage: redirects to a short-lived presigned URL, so file bytes never pass through the API.
 * Local storage (development): streams the file.
 */
@ApiTags('Files')
@Public()
@Controller('files')
export class FilesController {
  constructor(private readonly uploads: UploadsService) {}

  @Get(':key')
  async open(@Param('key') key: string, @Query() query: FileLinkQueryDto, @Res({ passthrough: true }) res: Response): Promise<StreamableFile | undefined> {
    if (!verifyFileLink(key, query.exp, query.sig)) throw AppException.notFound('File');
    // helmet defaults to same-origin; the admin portal and the app load these from other origins.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    const file = await this.uploads.openLink(key);
    if ('redirect' in file) {
      res.setHeader('Cache-Control', `private, max-age=${file.maxAgeSeconds}`);
      res.redirect(302, file.redirect);
      return undefined;
    }
    res.setHeader('Cache-Control', 'private, max-age=86400');
    return new StreamableFile(file.stream, { type: file.contentType, disposition: 'inline' });
  }
}
