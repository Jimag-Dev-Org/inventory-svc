# Jimag Autos – Inventory Service Runbook

Service: `inventory-svc`  
Owner: Jimag Platform / DevOps  
Environment: dev / staging / prod

## 0. Overview

The inventory service provides car listing and detail APIs:

- `GET /api/cars` – list cars with filters/pagination
- `GET /api/cars/:id` – fetch details for a single car

Supporting endpoints:

- `GET /api/healthz` – basic liveness
- `GET /api/readyz` – readiness (DB connectivity, etc.)
- `GET /metrics` – Prometheus metrics

Key metrics:

- `http_requests_total{method, route, status_code}`
- `http_request_duration_seconds_bucket{method, route, status_code, le}`
- `http_request_duration_seconds_count{...}`
- Node.js process metrics (`process_*`, `nodejs_*`) via `collectDefaultMetrics`.

SLOs are defined in `docs/slo-inventory-svc.md`.

---

## 1. First checks (any incident)

Whenever there is an alert (high 5xx, high latency, etc.):

1. **Check service health endpoints**
   - `GET /api/healthz`
   - `GET /api/readyz`
   - In K8s: `kubectl get pods -l app=inventory-svc`

2. **Check dashboards (once Prometheus/Grafana is in place)**
   - HTTP overview:
     - Requests/second
     - 5xx rate
     - Latency (P50/P90/P99) for `/api/cars` and `/api/cars/:id`
   - Process metrics:
     - CPU
     - Memory (heap + RSS)
     - Event loop lag (if configured)
   - Pod status:
     - Restarts
     - OOMKills
     - CrashLoopBackOff

3. **Check logs**
   - In dev: backend console logs.
   - In K8s: `kubectl logs deploy/inventory-svc` (and specific pods if needed).

---

## 2. Scenario: High 5xx rate on `/api/cars` or `/api/cars/:id`

**Symptoms**

- SLO availability dropping for:
  - `GET /api/cars`, or
  - `GET /api/cars/:id`
- `http_requests_total{status_code=~"5.."}` increasing.
- Users see generic “Failed to fetch cars” or 5xx responses.

### 2.1 Quick triage

1. **Confirm which route is affected**
   - Check panel for `route="/cars"` vs `route="/cars/:id"`.

2. **Check readiness & DB**
   - `GET /api/readyz`:
     - If failing → likely DB or downstream dependency issue.
   - Check DB status (RDS/PG, etc.) from infra tooling.

3. **Check recent deployments**
   - Was a new version of `inventory-svc` deployed recently?
   - If yes, compare error spike time with deploy time.

4. **Check logs around failing requests**
   - Look for stack traces, Prisma errors, or DB connection errors.

### 2.2 Common causes

- DB is unavailable / misconfigured:
  - Wrong connection string,
  - DB instance down or too many connections.
- Code regression:
  - Recent change to `cars.service.ts` or Prisma queries.
- Unexpected input causing unhandled exceptions.

### 2.3 Mitigation steps

1. **If caused by a bad deploy**
   - Roll back to last known good version of `inventory-svc`.
   - Confirm 5xx rate and SLI recover.

2. **If caused by DB issues**
   - Restore DB availability (restart instance, fix credentials, adjust connection limits).
   - Confirm `/api/readyz` becomes healthy again.

3. **If triggered by malformed traffic**
   - Add validation or guards on inputs.
   - Return 4xx (e.g. 400/404) instead of 5xx where appropriate.

4. **Update runbook/SLO docs**
   - Add notes if a new failure pattern was found.

---

## 3. Scenario: High latency but low 5xx

**Symptoms**

- Latency SLO degraded for `/api/cars` or `/api/cars/:id`:
  - `http_request_duration_seconds` shows fewer requests under 300ms.
- Error rate might still be low (mostly 2xx).
- Users experience “slow” pages.

### 3.1 Quick triage

1. **Confirm affected routes**
   - Is it list, detail, or both?

2. **Check Node process metrics**
   - CPU:
     - High CPU → `process_cpu_user_seconds_total` slope is steep.
   - Memory:
     - `nodejs_heap_size_used_bytes` near max?
   - Event loop lag (if available):
     - Elevated event loop lag → blocking code.

3. **Check DB metrics**
   - DB CPU / connections,
   - Slow queries.

### 3.2 Common causes

- Inefficient DB queries:
  - N+1 patterns,
  - Missing indexes.
- Heavy server-side computation:
  - Large in-memory transforms in list endpoints.
- Resource exhaustion:
  - Node process at high CPU,
  - Node under memory pressure → frequent GC / slow responses.

### 3.3 Mitigation steps

1. **Short term**
   - Scale out `inventory-svc` (more replicas) if CPU-bound.
   - Ensure DB has capacity (connections, CPU, IOPS).

2. **Long term**
   - Optimize queries (indexes, reduce data scanned).
   - Avoid large in-process sorting/aggregation where DB can handle it.
   - Profile the code path for `/api/cars` and `/api/cars/:id`.

---

## 4. Scenario: `/api/readyz` failing

**Symptoms**

- K8s marks pods as not Ready.
- `/api/readyz` returns non-200.
- Requests might be routed away or fail if no healthy pods remain.

### 4.1 Quick triage

1. **Call readiness endpoint**
   - `GET /api/readyz` and look at the body and status code.

2. **Check DB directly**
   - From any internal tool:
     - Try connecting with the same connection string as the app.

3. **Check Prisma / DB logs**
   - Look for connection refused, timeout, auth errors.

### 4.2 Common causes

- DB is down or restarting.
- Network / security group or firewall changes.
- Wrong DB credentials or misconfigured environment variables.

### 4.3 Mitigation steps

1. **Fix DB connectivity**
   - Restore DB instance,
   - Correct credentials / security groups.

2. **Verify after fix**
   - `/api/readyz` should return 200.
   - Pods should become Ready again.

3. **Preventive**
   - Add alerts on DB health and connection error rates.

---

## 5. Scenario: Pods in CrashLoopBackOff / OOMKilled

**Symptoms**

- `kubectl get pods` shows `CrashLoopBackOff` or `OOMKilled`.
- Frequent restarts on `inventory-svc` pods.
- Error rate increases, capacity drops.

### 5.1 Quick triage

1. **Describe pod**
   - `kubectl describe pod <pod-name>`
   - Look for:
     - `Last State: OOMKilled`
     - Exit codes,
     - Liveness probe failures.

2. **Check logs (previous container)**
   - `kubectl logs <pod-name> -p`
   - Look for:
     - Startup exceptions,
     - Fatal errors,
     - Memory-related crashes.

3. **Check process metrics**
   - Memory:
     - `process_resident_memory_bytes`,
     - `nodejs_heap_size_used_bytes`.
   - Look for steady growth (memory leak) vs spikes.

### 5.2 Common causes

- Memory leak in Node:
  - Heap grows until it hits the container limit → OOMKill.
- Wrong resource limits:
  - Limit too low compared to normal usage.
- Startup failures:
  - Misconfigured env vars, missing secrets, failing DB connection on boot.
- Overly strict livenessProbe:
  - Probe fails too early, restarts pods repeatedly.

### 5.3 Mitigation steps

1. **If it’s a memory leak**
   - Temporarily increase memory limits (if safe) to stabilize.
   - Capture heap profiles and fix the leak in code.
   - Deploy a fixed version, then dial back limits as needed.

2. **If limits are misconfigured**
   - Adjust requests/limits to match real usage (with some headroom).

3. **If startup is failing**
   - Fix env vars, secrets, or dependencies so the service can start cleanly.

4. **If livenessProbe is too aggressive**
   - Relax thresholds (initialDelay, timeout, failureThreshold),
   - Or separate liveness (basic) vs readiness (dependencies).

---

## 6. Scenario: Frontend shows “Failed to fetch car(s)” but backend looks healthy

**Symptoms**

- Frontend error message for list or detail pages.
- Backend SLOs look fine or only slightly degraded.

### 6.1 Quick triage

1. **Check if errors are 4xx vs 5xx**
   - Use `http_requests_total` by status_code and route.
   - Many 404s might indicate:
     - Wrong IDs in URLs,
     - Missing data, or,
     - User manually editing URLs.

2. **Check CORS / networking**
   - Ensure frontend is calling the correct `NEXT_PUBLIC_API_BASE` URL.
   - Check browser dev tools (network tab) for specific error codes:
     - CORS errors,
     - DNS failures,
     - Timeouts.

3. **Check for version mismatch**
   - Frontend expects an endpoint that backend does not yet implement or has changed.

### 6.2 Mitigation steps

- Fix misconfigurations (API base URL, CORS).
- Improve handling for 404s / client-side messaging.
- Align frontend expectations with backend contract (OpenAPI / Swagger as source of truth).

---

## 7. When to escalate / involve others

- Sustained SLO breach (availability or latency) with unclear root cause.
- Repeated OOMKills even after config adjustments.
- Wide impact beyond this service (e.g. DB shared by multiple services is unhealthy).
- Security-related incidents (e.g. suspicious traffic patterns).

In these cases:

- Escalate to:
  - Lead engineer / tech lead,
  - Platform or DB team (if DB-related),
  - Security if applicable.
- Document the incident, findings, and fixes in an internal incident log.

---

## 8. References

- SLO definitions: `docs/slo-inventory-svc.md`
- API docs: `/api/docs` (Swagger)
- Service metrics: `/metrics`
- Health:
  - `/api/healthz`
  - `/api/readyz`
