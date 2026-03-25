---
layout: docs
title: Configuration Reference — InferaDB
doc_title: Configuration Reference
doc_subtitle: Complete reference for Engine, Control, and Ledger configuration.
---

## Engine Configuration

Precedence (highest first): **environment variables** (`INFERADB__ENGINE__*`) > **YAML config** (`--config`) > **CLI flags**.

### Engine Settings

| Key                      | Env Var                                     | Default        | Description                                             |
| ------------------------ | ------------------------------------------- | -------------- | ------------------------------------------------------- |
| `threads`                | `INFERADB__ENGINE__THREADS`                 | CPU count      | Worker thread count                                     |
| `logging`                | `INFERADB__ENGINE__LOGGING`                 | `info`         | Log level (`trace`, `debug`, `info`, `warn`, `error`)   |
| `listen.http`            | `INFERADB__ENGINE__LISTEN__HTTP`            | `0.0.0.0:8080` | HTTP listen address                                     |
| `listen.grpc`            | `INFERADB__ENGINE__LISTEN__GRPC`            | `0.0.0.0:8081` | gRPC listen address                                     |
| `listen.mesh`            | `INFERADB__ENGINE__LISTEN__MESH`            | `0.0.0.0:8082` | Mesh/internal listen address                            |
| `storage`                | `INFERADB__ENGINE__STORAGE`                 | `memory`       | Storage backend (`memory` or `ledger`)                  |
| `ledger.endpoint`        | `INFERADB__ENGINE__LEDGER__ENDPOINT`        | —              | Ledger gRPC endpoint                                    |
| `ledger.client_id`       | `INFERADB__ENGINE__LEDGER__CLIENT_ID`       | —              | Client ID for Ledger authentication                     |
| `ledger.namespace_id`    | `INFERADB__ENGINE__LEDGER__NAMESPACE_ID`    | —              | Namespace ID for multi-tenant Ledger                    |
| `cache.enabled`          | `INFERADB__ENGINE__CACHE__ENABLED`          | `true`         | Enable evaluation and relationship cache                |
| `cache.capacity`         | `INFERADB__ENGINE__CACHE__CAPACITY`         | `100000`       | Maximum cache entries                                   |
| `cache.ttl`              | `INFERADB__ENGINE__CACHE__TTL`              | `300`          | Cache TTL in seconds                                    |
| `token.cache_ttl`        | `INFERADB__ENGINE__TOKEN__CACHE_TTL`        | `300`          | Token validation cache TTL in seconds                   |
| `token.clock_skew`       | `INFERADB__ENGINE__TOKEN__CLOCK_SKEW`       | `30`           | Allowed clock skew for token validation (seconds)       |
| `token.max_age`          | `INFERADB__ENGINE__TOKEN__MAX_AGE`          | `3600`         | Maximum token age in seconds                            |
| `pem`                    | `INFERADB__ENGINE__PEM`                     | —              | Path to PEM file for token signing/verification         |
| `discovery.mode`         | `INFERADB__ENGINE__DISCOVERY__MODE`         | `none`         | Peer discovery mode (`none`, `kubernetes`, `tailscale`) |
| `mesh.url`               | `INFERADB__ENGINE__MESH__URL`               | —              | Mesh endpoint URL for peer communication                |
| `mesh.timeout`           | `INFERADB__ENGINE__MESH__TIMEOUT`           | `5000`         | Mesh request timeout in milliseconds                    |
| `mesh.cache_ttl`         | `INFERADB__ENGINE__MESH__CACHE_TTL`         | `60`           | Mesh peer list cache TTL in seconds                     |
| `auth.enabled`           | `INFERADB__ENGINE__AUTH__ENABLED`           | `true`         | Enable request authentication                           |
| `auth.replay_protection` | `INFERADB__ENGINE__AUTH__REPLAY_PROTECTION` | `true`         | Enable JTI-based replay protection                      |

### Example YAML Configuration

```yaml
threads: 4
logging: info

listen:
  http: "0.0.0.0:8080"
  grpc: "0.0.0.0:8081"
  mesh: "0.0.0.0:8082"

storage: ledger
ledger:
  endpoint: "http://ledger:50051"
  client_id: "engine-01"

cache:
  enabled: true
  capacity: 100000
  ttl: 300

token:
  cache_ttl: 300
  clock_skew: 30
  max_age: 3600

pem: "/etc/inferadb/signing.pem"

discovery:
  mode: kubernetes

auth:
  enabled: true
  replay_protection: true
```

### Validate Configuration

```bash
inferadb-engine --config config.yaml --validate
```

## Control Configuration

The Control service is configured via CLI flags:

| Flag                | Default                 | Description                                |
| ------------------- | ----------------------- | ------------------------------------------ |
| `--listen`          | `0.0.0.0:9090`          | HTTP listen address                        |
| `--storage`         | `memory`                | Storage backend (`memory` or `ledger`)     |
| `--dev-mode`        | `false`                 | Enable development mode (relaxed security) |
| `--key-file`        | —                       | Path to Ed25519 signing key                |
| `--ledger-endpoint` | —                       | Ledger gRPC endpoint                       |
| `--frontend-url`    | `http://localhost:3000` | Dashboard URL (for CORS and redirects)     |
| `--log-level`       | `info`                  | Log level                                  |

### Example

```bash
inferadb-control \
  --listen 0.0.0.0:9090 \
  --storage ledger \
  --ledger-endpoint http://ledger:50051 \
  --key-file /etc/inferadb/control.key \
  --frontend-url https://dashboard.example.com \
  --log-level info
```

## Ledger Configuration

The Ledger is configured via CLI flags:

| Flag          | Default         | Description                                   |
| ------------- | --------------- | --------------------------------------------- |
| `--listen`    | `0.0.0.0:50051` | gRPC listen address                           |
| `--data`      | `./data`        | Data directory for B+ tree storage            |
| `--single`    | —               | Run as a single-node cluster (no quorum)      |
| `--join`      | —               | Join an existing cluster at the given address |
| `--cluster N` | —               | Bootstrap a new cluster with N initial nodes  |
| `--peers`     | —               | Comma-separated list of peer addresses        |
| `--region`    | —               | Region identifier for data residency          |
| `--metrics`   | —               | Metrics listen address (Prometheus)           |

### Single-Node (Development)

```bash
inferadb-ledger --single --data /var/lib/inferadb
```

### Three-Node Cluster

```bash
# Node 1 (bootstrap)
inferadb-ledger --cluster 3 --data /data --listen 0.0.0.0:50051 \
  --peers node2:50051,node3:50051

# Node 2
inferadb-ledger --join node1:50051 --data /data --listen 0.0.0.0:50051

# Node 3
inferadb-ledger --join node1:50051 --data /data --listen 0.0.0.0:50051
```

### Multi-Region

```bash
# US East node
inferadb-ledger --region us-east-1 --cluster 3 --data /data \
  --peers node2:50051,node3:50051

# EU West node
inferadb-ledger --region eu-west-1 --cluster 3 --data /data \
  --peers eu-node2:50051,eu-node3:50051
```
