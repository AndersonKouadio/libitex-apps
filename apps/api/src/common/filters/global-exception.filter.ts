import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus, Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { Sentry } from "../sentry/sentry";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: Record<string, unknown> = {
      success: false,
      error: "Erreur interne du serveur",
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();

      if (typeof exResponse === "object" && exResponse !== null) {
        body = { success: false, ...(exResponse as Record<string, unknown>) };
      } else {
        body = { success: false, error: String(exResponse) };
      }
    } else {
      this.logger.error(
        `Erreur non gérée: ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    // Sentry : seulement les erreurs 5xx (4xx = erreurs metier client,
    // pas des bugs). Sentry no-op si pas de DSN configure.
    if (status >= 500) {
      Sentry.captureException(exception, {
        tags: { method: request.method, path: request.url, status: String(status) },
      });
    }

    response.status(status).json({
      ...body,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
