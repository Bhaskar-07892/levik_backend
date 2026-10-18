import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ErrorCode } from '../errors/app.exception.js';

interface ErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  path: string;
  timestamp: string;
}

const PG_ERRORS: Record<string, { status: number; code: ErrorCode; message: string }> = {
  '23505': { status: HttpStatus.CONFLICT, code: ErrorCode.DUPLICATE, message: 'A record with the same unique value already exists.' },
  '23503': { status: HttpStatus.CONFLICT, code: ErrorCode.CONFLICT, message: 'A referenced record does not exist.' },
  '23514': { status: HttpStatus.BAD_REQUEST, code: ErrorCode.VALIDATION_FAILED, message: 'A value failed a database validation rule.' },
  '22P02': { status: HttpStatus.BAD_REQUEST, code: ErrorCode.VALIDATION_FAILED, message: 'A value has an invalid format.' },
  P0001: { status: HttpStatus.CONFLICT, code: ErrorCode.INVALID_STATE, message: 'The operation is not allowed.' },
};

/** Single error envelope for every failure: { statusCode, code, message, details, path, timestamp }. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const body = this.toBody(exception, request.url);

    if (body.statusCode >= 500) {
      this.logger.error({ err: exception, path: request.url }, 'Unhandled error');
    }
    response.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown, path: string): ErrorBody {
    const base = { path, timestamp: new Date().toISOString() };

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'object' && payload !== null && 'code' in payload) {
        const p = payload as { code: string; message: string; details?: unknown };
        return { statusCode: status, code: p.code, message: p.message, details: p.details, ...base };
      }
      // Nest built-ins and ValidationPipe errors.
      const raw = typeof payload === 'string' ? payload : (payload as { message?: string | string[] }).message;
      const messages = Array.isArray(raw) ? raw : [raw ?? exception.message];
      return {
        statusCode: status,
        code: this.codeForStatus(status),
        message: messages[0] ?? exception.message,
        details: messages.length > 1 ? messages : undefined,
        ...base,
      };
    }

    if (exception instanceof QueryFailedError) {
      const driverError = exception.driverError as { code?: string; detail?: string; constraint?: string };
      const mapped = driverError.code ? PG_ERRORS[driverError.code] : undefined;
      if (mapped) {
        const message = driverError.code === 'P0001' ? exception.message : mapped.message;
        return { statusCode: mapped.status, code: mapped.code, message, details: driverError.constraint, ...base };
      }
    }

    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, code: ErrorCode.INTERNAL, message: 'Something went wrong.', ...base };
  }

  private codeForStatus(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.VALIDATION_FAILED;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.LIMIT_REACHED;
      default:
        return status >= 500 ? ErrorCode.INTERNAL : ErrorCode.VALIDATION_FAILED;
    }
  }
}
