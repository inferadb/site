---
layout: docs
title: Docker Deployment — InferaDB
doc_title: Docker Deployment
doc_subtitle: Run InferaDB services as Docker containers.
---

## Container Images

InferaDB publishes official container images to Docker Hub:

| Image                       | Description                       |
| --------------------------- | --------------------------------- |
| `inferadb/inferadb-engine`  | Authorization engine (data plane) |
| `inferadb/inferadb-control` | Control plane (admin API)         |
| `inferadb/inferadb-ledger`  | Storage layer (Raft consensus)    |

Images are available for `linux/amd64` and `linux/arm64`.

## Engine Configuration

The Engine is configured via environment variables with the `INFERADB__ENGINE__` prefix. Nested configuration keys use double underscores as separators.

### Storage Backend

Set the storage backend to `memory` for development or `ledger` for production:

```bash
# In-memory (development)
docker run -p 8080:8080 -p 8081:8081 \
  -e INFERADB__ENGINE__STORAGE=memory \
  inferadb/inferadb-engine:latest

# Ledger (production)
docker run -p 8080:8080 -p 8081:8081 \
  -e INFERADB__ENGINE__STORAGE=ledger \
  -e INFERADB__ENGINE__LEDGER__ENDPOINT=http://ledger:50051 \
  inferadb/inferadb-engine:latest
```

### Common Environment Variables

| Variable                             | Default        | Description                            |
| ------------------------------------ | -------------- | -------------------------------------- |
| `INFERADB__ENGINE__STORAGE`          | `memory`       | Storage backend (`memory` or `ledger`) |
| `INFERADB__ENGINE__LEDGER__ENDPOINT` | —              | Ledger gRPC endpoint                   |
| `INFERADB__ENGINE__LISTEN__HTTP`     | `0.0.0.0:8080` | HTTP listen address                    |
| `INFERADB__ENGINE__LISTEN__GRPC`     | `0.0.0.0:8081` | gRPC listen address                    |
| `INFERADB__ENGINE__LISTEN__MESH`     | `0.0.0.0:8082` | Mesh/internal listen address           |
| `INFERADB__ENGINE__CACHE__ENABLED`   | `true`         | Enable evaluation cache                |
| `INFERADB__ENGINE__CACHE__CAPACITY`  | `100000`       | Maximum cache entries                  |
| `INFERADB__ENGINE__CACHE__TTL`       | `300`          | Cache TTL in seconds                   |
| `INFERADB__ENGINE__AUTH__ENABLED`    | `true`         | Enable JWT authentication              |

See [Configuration Reference](/docs/configuration) for the full list of settings.

## Docker Compose Example

```yaml
services:
  ledger:
    image: inferadb/inferadb-ledger:latest
    command: ["--single", "--data", "/data"]
    volumes:
      - ledger-data:/data
    ports:
      - "50051:50051"

  engine:
    image: inferadb/inferadb-engine:latest
    environment:
      INFERADB__ENGINE__STORAGE: ledger
      INFERADB__ENGINE__LEDGER__ENDPOINT: http://ledger:50051
    ports:
      - "8080:8080"
      - "8081:8081"
    depends_on:
      - ledger

  control:
    image: inferadb/inferadb-control:latest
    command:
      - "--storage=ledger"
      - "--ledger-endpoint=http://ledger:50051"
    ports:
      - "9090:9090"
    depends_on:
      - ledger

volumes:
  ledger-data:
```

## Pod Security

All InferaDB images follow container security best practices:

| Property             | Value                     |
| -------------------- | ------------------------- |
| User                 | Non-root (`UID 65532`)    |
| Filesystem           | Read-only root filesystem |
| Capabilities         | No added capabilities     |
| Privilege escalation | Disabled                  |

The containers run as a non-root user with UID 65532 and expect a read-only root filesystem. If you need writable storage (Ledger data directory), mount a volume at the data path.

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 65532
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
```
