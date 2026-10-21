import { HttpException, HttpStatus } from '@nestjs/common';

/** Stable machine-readable error codes the clients can switch on. */
export const ErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_PROCESSED: 'ALREADY_PROCESSED',
  INVALID_STATE: 'INVALID_STATE',
  CHECKS_FAILED: 'CHECKS_FAILED',
  INSUFFICIENT_POINTS: 'INSUFFICIENT_POINTS',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  DUPLICATE: 'DUPLICATE',
  LIMIT_REACHED: 'LIMIT_REACHED',
  INVALID_LABEL: 'INVALID_LABEL',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
  REGISTRATION_REQUIRED: 'REGISTRATION_REQUIRED',
  INVALID_OTP: 'INVALID_OTP',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  INTERNAL: 'INTERNAL',
  STORAGE_UNAVAILABLE: 'STORAGE_UNAVAILABLE',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super({ code, message, details }, status);
  }

  static notFound(entity: string, id?: string) {
    return new AppException(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, id ? `${entity} ${id} not found.` : `${entity} not found.`);
  }

  static invalidState(message: string) {
    return new AppException(HttpStatus.CONFLICT, ErrorCode.INVALID_STATE, message);
  }

  static alreadyProcessed(message: string) {
    return new AppException(HttpStatus.CONFLICT, ErrorCode.ALREADY_PROCESSED, message);
  }

  static rule(code: ErrorCode, message: string, details?: unknown) {
    return new AppException(HttpStatus.UNPROCESSABLE_ENTITY, code, message, details);
  }
}
