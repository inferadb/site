---
layout: docs
title: Observability
doc_title: Observability
doc_subtitle: Metrics, tracing, and logging across InferaDB services.
---

## Prometheus Metrics

Each service exposes a `/metrics` endpoint in Prometheus exposition format.

### Engine Metrics

#### Authorization

| Metric                            | Type      | Description                          |
| --------------------------------- | --------- | ------------------------------------ |
| `inferadb_checks_total`           | Counter   | Total authorization checks performed |
| `inferadb_check_duration_seconds` | Histogram | Authorization check latency          |

#### Cache

| Metric                        | Type    | Description  |
| ----------------------------- | ------- | ------------ |
| `inferadb_cache_hits_total`   | Counter | Cache hits   |
| `inferadb_cache_misses_total` | Counter | Cache misses |

#### Storage

| Metric                                    | Type      | Description                 |
| ----------------------------------------- | --------- | --------------------------- |
| `inferadb_storage_read_duration_seconds`  | Histogram | Storage read latency        |
| `inferadb_storage_write_duration_seconds` | Histogram | Storage write latency       |
| `inferadb_replication_lag_seconds`        | Gauge     | Replication lag from leader |

#### API

| Metric                        | Type    | Description                           |
| ----------------------------- | ------- | ------------------------------------- |
| `inferadb_api_requests_total` | Counter | Total API requests by method and path |
| `inferadb_api_errors_total`   | Counter | Total API errors by status code       |

### Auth Metrics

| Metric                                 | Type      | Description                     |
| -------------------------------------- | --------- | ------------------------------- |
| `inferadb_auth_attempts_total`         | Counter   | Authentication attempts         |
| `inferadb_auth_success_total`          | Counter   | Successful authentications      |
| `inferadb_auth_failure_total`          | Counter   | Failed authentications          |
| `inferadb_auth_duration_seconds`       | Histogram | Authentication processing time  |
| `inferadb_jwks_cache_hits_total`       | Counter   | JWKS cache hits                 |
| `inferadb_jwks_cache_misses_total`     | Counter   | JWKS cache misses               |
| `inferadb_jwt_validation_errors_total` | Counter   | JWT validation errors by reason |

### Scrape Configuration

Prometheus scrape config for a Docker deployment:

```yaml
scrape_configs:
  - job_name: inferadb-engine
    static_configs:
      - targets: ["engine:8080"]
  - job_name: inferadb-control
    static_configs:
      - targets: ["control:9090"]
  - job_name: inferadb-ledger
    static_configs:
      - targets: ["ledger:50051"]
```

For Kubernetes, enable the ServiceMonitor in the Helm chart:

```yaml
engine:
  serviceMonitor:
    enabled: true
    interval: 15s
```

## OpenTelemetry Tracing

Traces are exported via **OTLP**, spanning the full request lifecycle (API ingestion through evaluation and response).

### Configuration

Standard OpenTelemetry environment variables:

| Variable                      | Default                    | Description                                                  |
| ----------------------------- | -------------------------- | ------------------------------------------------------------ |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | —                          | OTLP collector endpoint (e.g., `http://otel-collector:4317`) |
| `OTEL_SERVICE_NAME`           | `inferadb-engine`          | Service name in traces                                       |
| `OTEL_TRACES_SAMPLER`         | `parentbased_traceidratio` | Sampling strategy                                            |
| `OTEL_TRACES_SAMPLER_ARG`     | `1.0`                      | Sampling rate (0.0 to 1.0)                                   |

### Example

```bash
docker run -p 8080:8080 -p 8081:8081 \
  -e OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317 \
  -e OTEL_SERVICE_NAME=inferadb-engine \
  inferadb/inferadb-engine:latest
```

Traces are compatible with any OTLP-capable backend — Jaeger, Tempo, Honeycomb, Datadog, etc.

## Structured Logging

Log levels are controlled per-module via `RUST_LOG`:

```bash
# Set global level to info, with debug for the evaluator
RUST_LOG=info,inferadb_core::evaluator=debug

# Trace-level logging for auth (verbose)
RUST_LOG=info,inferadb_auth=trace
```

### Log Format

Each log line is a JSON object:

```json
{
  "timestamp": "2026-03-24T10:15:30.123Z",
  "level": "INFO",
  "target": "inferadb_api::handler",
  "message": "check completed",
  "vault_id": "v_abc123",
  "duration_ms": 1.8,
  "result": "ALLOW",
  "span_id": "a1b2c3d4e5f6"
}
```

### Audit Logging

Security events are logged and persisted to the Ledger:

| Event                      | Description                                      |
| -------------------------- | ------------------------------------------------ |
| `AuthenticationSuccess`    | Successful token validation                      |
| `AuthenticationFailure`    | Failed authentication attempt                    |
| `ScopeViolation`           | Request exceeded the token's granted scopes      |
| `TenantIsolationViolation` | Attempt to access data outside the token's vault |

These events are always logged at `WARN` or `ERROR` level regardless of the configured log level.

## Grafana Dashboards

Pre-built Grafana dashboards:

- **Engine Overview** — Check rate, latency percentiles, cache hit ratio, error rate
- **Ledger Health** — Raft leader status, write latency, replication lag, snapshot status
- **Authentication** — Auth success/failure rate, JWKS cache performance, JWT error breakdown
- **Tenant Activity** — Per-vault check volume, write rate, and cache efficiency

Available as JSON files in the repository. Import directly or use Grafana dashboard provisioning.
