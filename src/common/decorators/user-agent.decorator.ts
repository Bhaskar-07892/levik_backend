import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * The caller's User-Agent, recorded on refresh tokens for session auditing.
 * A custom decorator (not @Headers) keeps it out of the OpenAPI contract, where generated clients
 * would otherwise treat it as a required header.
 */
export const UserAgent = createParamDecorator((_: unknown, ctx: ExecutionContext): string | undefined => ctx.switchToHttp().getRequest<Request>().headers['user-agent']);
