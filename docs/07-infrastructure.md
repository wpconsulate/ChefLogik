# Infrastructure — Kubernetes + Terraform + Helm + Docker

## Overview

The application runs as multiple Kubernetes pods, each responsible for a single concern. All images are built from Dockerfiles and deployed via Helm charts. Terraform provisions the cloud infrastructure (cluster, databases, cache, storage).

---

## Docker Images (one per service)

```
ghcr.io/{org}/rms-api          ← Laravel API (PHP-FPM + Nginx)
ghcr.io/{org}/rms-worker       ← Laravel Horizon queue workers
ghcr.io/{org}/rms-scheduler    ← Laravel scheduler (cron)
ghcr.io/{org}/rms-reverb       ← Laravel Reverb WebSocket server
ghcr.io/{org}/rms-web          ← React app (Nginx static)
```

### api Dockerfile
```dockerfile
FROM php:8.3-fpm-alpine

RUN apk add --no-cache nginx postgresql-client redis

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY . .

RUN composer install --no-dev --optimize-autoloader \
    && php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache

CMD ["php-fpm"]
```

### web Dockerfile
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
```

---

## Kubernetes Architecture

```
Namespace: rms-production
  ├── Deployment: rms-api         (3 replicas, HPA min=2 max=10)
  ├── Deployment: rms-worker      (2 replicas, HPA min=1 max=5)
  ├── Deployment: rms-scheduler   (1 replica — must be 1)
  ├── Deployment: rms-reverb      (2 replicas)
  ├── Deployment: rms-web         (2 replicas, HPA min=1 max=5)
  ├── Service: rms-api-svc        (ClusterIP)
  ├── Service: rms-reverb-svc     (ClusterIP, port 8080)
  ├── Service: rms-web-svc        (ClusterIP)
  ├── Ingress: rms-ingress        (NGINX ingress controller)
  │     ├── /api/   → rms-api-svc
  │     ├── /       → rms-web-svc
  │     └── ws://   → rms-reverb-svc (WebSocket upgrade)
  ├── HorizontalPodAutoscaler: rms-api-hpa
  ├── HorizontalPodAutoscaler: rms-worker-hpa
  └── ConfigMap + Secrets
```

---

## Helm Chart Structure

```
helm/
  rms/
    Chart.yaml
    values.yaml            ← Default values (dev)
    values-staging.yaml    ← Staging overrides
    values-production.yaml ← Production overrides
    templates/
      api-deployment.yaml
      api-service.yaml
      worker-deployment.yaml
      scheduler-deployment.yaml
      reverb-deployment.yaml
      reverb-service.yaml
      web-deployment.yaml
      web-service.yaml
      ingress.yaml
      hpa-api.yaml
      hpa-worker.yaml
      configmap.yaml
      secret.yaml          ← References Kubernetes secrets, not values
      serviceaccount.yaml
      _helpers.tpl
```

### values.yaml (example structure)
```yaml
api:
  image:
    repository: ghcr.io/org/rms-api
    tag: latest
    pullPolicy: IfNotPresent
  replicaCount: 2
  resources:
    requests: { cpu: 250m, memory: 512Mi }
    limits: { cpu: 1000m, memory: 1Gi }
  env:
    APP_ENV: production
    LOG_CHANNEL: stderr
    QUEUE_CONNECTION: redis

worker:
  replicaCount: 2
  queues: "critical,high,default,analytics,low"

reverb:
  replicaCount: 2
  port: 8080

ingress:
  host: app.yourdomain.com
  tls: true
  certManager: true
```

---

## Terraform Resources

```hcl
# Key resources to provision:

# Kubernetes cluster (example: GKE)
resource "google_container_cluster" "primary" { ... }

# Cloud SQL — PostgreSQL 16
resource "google_sql_database_instance" "postgres" {
  database_version = "POSTGRES_16"
  settings {
    tier = "db-custom-4-16384"
    backup_configuration { enabled = true }
    ip_configuration { ipv4_enabled = false; private_network = ... }
  }
}

# Cloud Memorystore — Redis 7
resource "google_redis_instance" "cache" {
  memory_size_gb = 4
  redis_version  = "REDIS_7_0"
  tier           = "STANDARD_HA"
}

# Cloud Storage — S3-compatible
resource "google_storage_bucket" "media" { ... }

# Kubernetes secrets from Terraform outputs
resource "kubernetes_secret" "app_secrets" {
  data = {
    DB_PASSWORD         = random_password.db.result
    REDIS_PASSWORD      = random_password.redis.result
    STRIPE_SECRET_KEY   = var.stripe_secret_key
    STRIPE_WEBHOOK_KEY  = var.stripe_webhook_key
    REVERB_APP_SECRET   = random_password.reverb.result
  }
}
```

---

## Environment Variables (per pod via Kubernetes secrets)

All sensitive values come from Kubernetes secrets, never from values.yaml or Helm values.

```bash
# Application
APP_KEY=base64:...
APP_ENV=production
APP_URL=https://app.yourdomain.com

# Database
DB_CONNECTION=pgsql
DB_HOST=10.x.x.x          # Private IP from Terraform output
DB_DATABASE=rms_production
DB_USERNAME=rms_app
DB_PASSWORD=<from k8s secret>

# Redis
REDIS_HOST=10.x.x.x
REDIS_PASSWORD=<from k8s secret>

# Reverb (WebSocket)
REVERB_APP_ID=rms-app
REVERB_APP_KEY=<from k8s secret>
REVERB_APP_SECRET=<from k8s secret>
REVERB_HOST=reverb.yourdomain.com
REVERB_PORT=443

# Stripe
STRIPE_KEY=pk_live_...
STRIPE_SECRET=<from k8s secret>
STRIPE_WEBHOOK_SECRET=<from k8s secret>

# Twilio
TWILIO_SID=<from k8s secret>
TWILIO_TOKEN=<from k8s secret>
TWILIO_FROM=+44...

# SendGrid
SENDGRID_API_KEY=<from k8s secret>

# S3-compatible storage
AWS_ACCESS_KEY_ID=<from k8s secret>
AWS_SECRET_ACCESS_KEY=<from k8s secret>
AWS_DEFAULT_REGION=eu-west-2
AWS_BUCKET=rms-media-production
```

---

## Local Development (docker-compose)

```yaml
# docker-compose.yml
services:
  api:
    build: { context: ./api, dockerfile: Dockerfile.dev }
    volumes: [./api:/var/www/html]
    ports: ["8000:8000"]
    depends_on: [postgres, redis]
    environment:
      DB_HOST: postgres
      REDIS_HOST: redis

  worker:
    build: { context: ./api, dockerfile: Dockerfile.dev }
    command: php artisan horizon
    volumes: [./api:/var/www/html]
    depends_on: [postgres, redis]

  scheduler:
    build: { context: ./api, dockerfile: Dockerfile.dev }
    command: php artisan schedule:work
    volumes: [./api:/var/www/html]

  reverb:
    build: { context: ./api, dockerfile: Dockerfile.dev }
    command: php artisan reverb:start --port=8080
    ports: ["8080:8080"]

  web:
    build: { context: ./web, dockerfile: Dockerfile.dev }
    volumes: [./web:/app]
    ports: ["3000:3000"]
    command: npm run dev

  postgres:
    image: postgres:16-alpine
    environment: { POSTGRES_DB: rms_dev, POSTGRES_USER: rms, POSTGRES_PASSWORD: secret }
    volumes: [postgres_data:/var/lib/postgresql/data]
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

volumes:
  postgres_data:
```

---

## Health Check Endpoints

```
GET /api/health          → { status: "ok", db: "ok", redis: "ok", version: "1.0.0" }
GET /api/health/ready    → Kubernetes readiness probe (checks DB connection)
GET /api/health/live     → Kubernetes liveness probe (lightweight ping)
```
