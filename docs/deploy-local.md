---
layout: docs
title: Local Development — InferaDB
doc_title: Local Development
doc_subtitle: Run InferaDB on your machine for development and testing.
---

## CLI Development Environment

The `inferadb` CLI provides a built-in development environment that bootstraps the full InferaDB stack using Docker.

### Start

```bash
inferadb dev start
```

This launches Engine, Control, Ledger, and Dashboard containers. Once running, the following ports are available:

| Service       | Port             |
| ------------- | ---------------- |
| Engine (REST) | `localhost:8080` |
| Engine (gRPC) | `localhost:8081` |
| Control       | `localhost:9090` |
| Dashboard     | `localhost:3000` |

The Dashboard is exposed via port-forward from the container.

### Stop

```bash
inferadb dev stop
```

Stops all running InferaDB containers. Data persisted in the Ledger is retained in Docker volumes.

### Status

```bash
inferadb dev status
```

Shows the current state of all InferaDB containers — running, stopped, or not found.

### Logs

```bash
inferadb dev logs
inferadb dev logs engine    # Follow logs for a specific service
inferadb dev logs ledger
```

Tails container logs. Useful for debugging schema push failures or unexpected authorization results.

### Reset

```bash
inferadb dev reset
```

Stops all containers and removes their volumes, wiping all data. Useful for starting fresh.

## Docker Compose

If you prefer to manage the stack yourself, you can use Docker Compose directly. A `docker-compose.yml` is available in the repository:

```bash
docker compose up -d
```

This provides the same stack as `inferadb dev start` but gives you full control over the Compose configuration.

## Engine-Only (In-Memory)

For the simplest possible setup, run the Engine as a standalone container with the in-memory storage backend:

```bash
docker run -p 8080:8080 -p 8081:8081 inferadb/inferadb-engine:latest
```

This starts the Engine with no external dependencies. Data is stored in memory and will not survive container restarts. This mode is useful for:

- Quick prototyping
- CI/CD pipeline integration tests
- Evaluating the Engine's API without setting up the full stack

To use the in-memory backend, no additional configuration is needed — it is the default when no Ledger endpoint is configured.
