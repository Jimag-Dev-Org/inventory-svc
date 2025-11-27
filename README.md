# inventory-svc (Jimag Autos Marketplace)

Backend service for Jimag Autos Marketplace. Exposes a REST API for managing car inventory and images.

- Stack: **NestJS**, **TypeScript**, **PostgreSQL** (Prisma), **Redis**, **S3**-compatible storage
- Observability: **Prometheus** `/metrics`, structured logs
- Health: `/api/healthz` (liveness), `/api/readyz` (readiness)

---

## 1. Responsibilities

- Store and retrieve car listings (make, model, year, price, mileage, etc.).
- Manage image metadata for cars (image URLs, ordering, etc.).
- Generate presigned upload URLs for S3 so the frontend can upload images directly.
- Expose metrics and health endpoints for Kubernetes and Prometheus.

This service does **not** handle authentication directly; JWT verification is delegated to an auth layer (e.g. Cognito) and enforced via NestJS guards.

---

## 2. API Overview

Base path: `/api`

| Method | Path                    | Description                                      | Notes                         |
| ------ | ----------------------- | ------------------------------------------------ | ----------------------------- |
| GET    | `/api/cars`             | List cars with filtering, sorting, pagination    | Used by homepage/search list  |
| GET    | `/api/cars/:id`         | Get details of a single car                      | Used by car detail page       |
| POST   | `/api/uploads/presign`  | Get presigned S3 URL for image upload            | Called by admin upload UI     |
| POST   | `/api/cars/:id/images`  | Attach image metadata to a car                   | Called after S3 upload        |
| GET    | `/api/cars/:id/images`  | Get image metadata for a car                     | Used to render image gallery  |
| GET    | `/api/healthz`          | Liveness probe (is the app process up?)          | For Kubernetes livenessProbe  |
| GET    | `/api/readyz`           | Readiness probe (DB/Redis/etc. connectivity)     | For Kubernetes readinessProbe |
| GET    | `/metrics`              | Prometheus metrics                               | Scraped by Prometheus         |

For full details, see Swagger docs at: `/api/docs` (when the service is running).

---

## 3. Configuration & Environment Variables

### 3.1. `.env` / `.env.example`

Configuration is managed via environment variables.

- **Do not** commit your real `.env` file.
- This repo should contain a **`.env.example`** file that lists all required variables with placeholder values.

Example `./.env.example`:

```env
# Database (PostgreSQL)
DATABASE_URL=postgresql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:5432/<DB_NAME>

# Redis
REDIS_URL=redis://<REDIS_HOST>:6379

# S3-compatible storage (LocalStack in dev, S3 in prod)
S3_ENDPOINT=http://localhost:4566
S3_BUCKET=jimag-autos-images
S3_REGION=us-east-1

# Auth (if/when Cognito or another IdP is added)
JWT_AUDIENCE=<JWT_AUDIENCE>
JWT_ISSUER=<JWT_ISSUER>


- Swagger: http://localhost:3001/api/docs
- Metrics: http://localhost:3001/metrics
- Health:  http://localhost:3001/healthz