# Jimag Autos – Inventory Service Logging

Service: `inventory-svc`  
Owner: Jimag Platform / DevOps  
Environment: dev / staging / prod

## 1. Goals

Logging for `inventory-svc` should:

1. Help diagnose **incidents** (errors, high latency, OOMs, etc.).
2. Provide **audit-style traces** of key operations (e.g., listing cars, fetching car details, image operations).
3. Be **machine-friendly** for search/filters in a log system (CloudWatch, ELK, Loki).
4. Play nicely with our **SLOs and metrics** (correlate logs with 5xx spikes, latency, etc.).

## 2. Destination

- All logs are written to **stdout/stderr**.
- In Kubernetes, a log agent (Fluent Bit, etc.) will ship logs to a central log store.
- No direct file writes from the app (no `/var/log/...`): we rely on the container runtime and log pipeline.

## 3. Format

### 3.1 JSON log lines

All logs should be **single-line JSON** objects.

Example request log:

```json
{
  "timestamp": "2025-12-15T03:21:45.123Z",
  "level": "info",
  "service": "inventory-svc",
  "env": "dev",
  "message": "HTTP request",
  "method": "GET",
  "route": "/api/cars",
  "path": "/api/cars",
  "statusCode": 200,
  "durationMs": 42,
  "requestId": "a1b2c3d4",
  "userId": null
}
