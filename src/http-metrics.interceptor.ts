// inventory-svc/src/http-metrics.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  HttpException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { httpRequestsTotal, httpRequestDurationSeconds } from './metrics.js';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<Request>();
    const res = httpCtx.getResponse<Response>();

    const method = req.method;
    // Express route pattern if available (e.g. '/cars/:id'), else fallback to path
    const route = (req.route && req.route.path) || req.path || 'unknown';

    // Start a timer in the histogram with method/route labels
    const endTimer = httpRequestDurationSeconds.startTimer({ method, route });

    return next.handle().pipe(
      tap(() => {
        const statusCode = res.statusCode || 200;

        // Stop timer and record with status code
        endTimer({ status_code: String(statusCode) });

        // Increment the counter
        httpRequestsTotal.inc({
          method,
          route,
          status_code: String(statusCode),
        });
      }),
      catchError((err) => {
        // If an error happens, we still record metrics
        let statusCode = 500;
        if (err instanceof HttpException) {
          statusCode = err.getStatus();
        }

        endTimer({ status_code: String(statusCode) });
        httpRequestsTotal.inc({
          method,
          route,
          status_code: String(statusCode),
        });

        // Re-throw so Nest can return the proper 4xx/5xx
        throw err;
      }),
    );
  }
}
