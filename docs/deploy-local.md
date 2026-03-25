---
layout: docs
title: Local Development — InferaDB
doc_title: Local Development
doc_subtitle: Run InferaDB on your machine for development and testing.
---

## CLI Development Environment

The `inferadb` CLI bootstraps the full InferaDB stack using Docker.

### Start

```bash
inferadb dev start
```

Launches Engine, Control, Ledger, and Dashboard containers:

| Service       | Port             |
| ------------- | ---------------- |
| Engine (REST) | `localhost:8080` |
| Engine (gRPC) | `localhost:8081` |
| Control       | `localhost:9090` |
| Dashboard     | `localhost:3000` |

### Stop

```bash
inferadb dev stop
```

Stops containers. Ledger data persists in Docker volumes.

### Status

```bash
inferadb dev status
```

Shows container state (running, stopped, or not found).

### Logs

```bash
inferadb dev logs
inferadb dev logs engine    # Follow logs for a specific service
inferadb dev logs ledger
```

Tails container logs.

### Reset

```bash
inferadb dev reset
```

Stops containers and removes volumes, wiping all data.

## Docker Compose

A `docker-compose.yml` is available in the repository for direct control over the stack:

```bash
docker compose up -d
```

## Engine-Only (In-Memory)

Run the Engine standalone with the in-memory backend (default when no Ledger endpoint is configured):

```bash
docker run -p 8080:8080 -p 8081:8081 inferadb/inferadb-engine:latest
```

Data does not survive container restarts. Useful for prototyping, CI/CD integration tests, and API evaluation.
