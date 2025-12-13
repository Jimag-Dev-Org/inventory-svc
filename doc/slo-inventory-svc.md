# Jimag Autos – Inventory Service SLOs

Service: `inventory-svc` (NestJS + Prisma, backing `/api/cars` and `/api/cars/:id`)

## 1. Scope

The Inventory Service is responsible for:

- Listing cars with filters and pagination (`GET /api/cars`)
- Returning car details (`GET /api/cars/:id`)
- Managing car images (`GET/POST /api/cars/:id/images`)

For SLO v1 we focus on the **read paths** that drive the user experience:

- `GET /api/cars`       – list view
- `GET /api/cars/:id`   – detail view

Image endpoints and admin flows are out of scope for the first iteration.

Health endpoints:

- `/api/healthz`
- `/api/readyz`

are **not** included in SLIs (they are for K8s / operator health).

Metrics come from the `prom-client` instrumentation:

- `http_requests_total{method, route, status_code}`
- `http_request_duration_seconds_bucket{method, route, status_code, le}`
- `http_request_duration_seconds_count{method, route, status_code}`

> Note: `route` is the Express route pattern, e.g. `/cars`, `/cars/:id`.

---

## 2. SLIs

### 2.1 Availability SLI

**Definition (per route):**

> Percentage of successful HTTP responses (non-5xx) over all requests.

For `GET /api/cars`:

```promql
sum(rate(http_requests_total{
  route="/cars",
  method="GET",
  status_code!~"5.."
}[5m]))
/
sum(rate(http_requests_total{
  route="/cars",
  method="GET"
}[5m]))
```

For `GET /api/cars/:id`:

```promql
sum(rate(http_requests_total{
  route="/cars/:id",
  method="GET",
  status_code!~"5.."
}[5m]))
/
sum(rate(http_requests_total{
  route="/cars/:id",
  method="GET"
}[5m]))
```

## 2.2 Latency SLI

Definition (per route):

Percentage of requests completed within 300 ms (P99) from the service perspective.

For `GET /api/cars`:
 
```promql
 sum(rate(http_request_duration_seconds_bucket{
  route="/cars",
  method="GET",
  le="0.3"
}[5m]))
/
sum(rate(http_request_duration_seconds_count{
  route="/cars",
  method="GET"
}[5m]))
```

For `GET /api/cars/:id`:

```promql
sum(rate(http_request_duration_seconds_bucket{
  route="/cars/:id",
  method="GET",
  le="0.3"
}[5m]))
/
sum(rate(http_request_duration_seconds_count{
  route="/cars/:id",
  method="GET"
}[5m]))
```

# 3. SLO Targets

**Initial (v1) SLO targets for inventory-svc in production:** 

# 3.1 Availability SLOs

**SLO-A1 – List cars availability**

- Route: `GET /api/cars`

- Target: 99.9% availability over a 30-day window

- Justification: Listing cars is the primary landing flow.

# SLO-A2 – Car detail availability

- Route: `GET /api/cars/:id`

- Target: 99.9% availability over a 30-day window

- Justification: Viewing details is critical to converting interest into action.

# 3.2 Latency SLOs

**SLO-L1 – List cars latency**

- Route: `GET /api/cars`

- Target: 99% of responses complete in ≤ 300 ms over 30 days

- SLI: latency SLI query above with `route="/cars"`.

- Justification: Users expect fast list views when browsing inventory.

# SLO-L2 – Car detail latency

- Route: `GET /api/cars/:id`

- Target: 99% of responses complete in ≤ 300 ms over 30 days

- SLI: latency SLI query above with `route="/cars/:id"`.

- Justification: Car detail pages are a primary engagement path.

# 4. Error budget (high-level)

**With a 99.9% availability SLO over 30 days:**

- Error budget ≈ 0.1% of requests can be bad (5xx).

- For 1,000,000 requests/month, that’s ~1,000 errors allowed before SLO is violated.

**With a 99% latency SLO:**

- Up to 1% of requests can be slower than 300 ms without breaching the SLO.

**Error-budget policy (v1, manual):**

# If we burn >50% of error budget in a week:

- Pause risky changes to inventory-svc.

- Prioritize reliability work (fix perf/bug issues).
