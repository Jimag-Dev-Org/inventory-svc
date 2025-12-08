// inventory-svc/src/metrics.ts
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

// Shared registry for this service
export const register = new Registry();

// Collect default Node.js/process metrics into this registry
collectDefaultMetrics({ register });

// Counter: how many HTTP requests, by method/route/status
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [register],
});

// Histogram: how long requests take, by method/route/status
export const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  // Latency buckets in seconds
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});
