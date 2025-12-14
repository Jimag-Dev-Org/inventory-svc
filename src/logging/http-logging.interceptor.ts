// src/logging/http-logging.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const httpCtx = context.switchToHttp();
    const req: any = httpCtx.getRequest();
    const res: any = httpCtx.getResponse();

    const method = req.method;
    const path = req.url;
    // Express attaches the "route" pattern after matching, e.g. "/cars/:id"
    const route = req.route?.path || path;

    const baseLog = {
      timestamp: new Date().toISOString(),
      service: 'inventory-svc',
      env: process.env.NODE_ENV || 'dev',
      method,
      route,
      path,
    };

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - now;
          const statusCode = res.statusCode;

          const logRecord = {
            ...baseLog,
            level: 'info',
            message: 'HTTP request',
            statusCode,
            durationMs,
          };

          // One JSON log line per request
          // eslint-disable-next-line no-console
          console.log(JSON.stringify(logRecord));
        },
        error: (err: any) => {
          const durationMs = Date.now() - now;
          const statusCode = res.statusCode ?? err?.status ?? 500;

          const errorLog = {
            ...baseLog,
            level: 'error',
            message: 'HTTP request failed',
            statusCode,
            durationMs,
            errorName: err?.name,
            errorMessage: err?.message,
            stack: err?.stack,
          };

          // eslint-disable-next-line no-console
          console.error(JSON.stringify(errorLog));
        },
      }),
    );
  }
}
