import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { Prisma } from '@prisma/client';

type ErrorEnvelope = {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, error } = this.resolve(exception);

    const envelope: ErrorEnvelope = {
      statusCode,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(statusCode).json(envelope);
  }

  private resolve(exception: unknown): {
    statusCode: number;
    message: string | string[];
    error: string;
  } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null) {
        const body = response as {
          message?: string | string[];
          error?: string;
        };
        return {
          statusCode: exception.getStatus(),
          message: body.message ?? exception.message,
          error: body.error ?? exception.name,
        };
      }
      return {
        statusCode: exception.getStatus(),
        message: exception.message,
        error: exception.name,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        const target = Array.isArray(exception.meta?.target)
          ? exception.meta.target.join(', ')
          : 'field';
        return {
          statusCode: HttpStatus.CONFLICT,
          message: `A record with this ${target} already exists.`,
          error: 'Conflict',
        };
      }
      if (exception.code === 'P2025') {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Resource not found.',
          error: 'Not Found',
        };
      }
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Bad Request',
      };
    }

    if (exception instanceof Error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: exception.name,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Error',
    };
  }
}
