---
layout: docs
title: Engine Architecture — InferaDB
doc_title: Engine Architecture
doc_subtitle: Deep dive into InferaDB's data plane — the authorization evaluation engine.
---

## Overview

The Engine is InferaDB's **data plane**. It receives authorization requests, evaluates them against IPL policies and stored relationships, and returns decisions. It is written in Rust and designed for low-latency, high-throughput operation.

## Crate Structure

The Engine is organized into the following internal crates:

| Crate        | Responsibility                                           |
| ------------ | -------------------------------------------------------- |
| `api`        | HTTP and gRPC request handlers, routing, middleware      |
| `core`       | Evaluator, graph traversal, IPL parser, query optimizer  |
| `auth`       | JWT validation, JWKS fetching, OAuth token introspection |
| `cache`      | Moka-based LRU caching layer                             |
| `config`     | Configuration loading and validation                     |
| `store`      | Storage abstraction with memory and ledger backends      |
| `observe`    | Prometheus metrics and OpenTelemetry tracing             |
| `wasm`       | Wasmtime sandbox for ABAC condition modules              |
| `repository` | Data access layer over the store abstraction             |
| `types`      | Shared type definitions                                  |
| `const`      | Constants and static configuration values                |

## Core Services

The Engine exposes six internal services through its API layer:

### EvaluationService

Handles `Check` and `BatchCheck` operations. Parses the IPL schema into an evaluation plan, traverses the relationship graph, and returns ALLOW or DENY with a revision token.

### ExpansionService

Expands a computed relation into the full tree of contributing relations and entities. Used for debugging and the Dashboard's decision trace view.

### RelationshipService

Reads and writes relationship tuples. Write operations are forwarded to the Ledger for durable storage.

### ResourceService

Lists resources that a given subject has access to via a specified relation.

### SubjectService

Lists subjects that have a given relation to a specified resource.

### WatchService

Streams real-time updates when relationships change, enabling clients to invalidate local caches.

## Listen Ports

The Engine binds to three ports:

| Port | Protocol | Purpose                                   |
| ---- | -------- | ----------------------------------------- |
| 8080 | HTTP     | REST API and health checks                |
| 8081 | gRPC     | gRPC API for authorization checks         |
| 8082 | HTTP     | Mesh/internal endpoint for peer discovery |

## Storage Backends

### Memory

An in-process backend using concurrent hash maps. Provides **sub-microsecond** read latency and requires no external dependencies. Intended for development and testing — data does not survive restarts.

```yaml
storage: memory
```

### Ledger

The production backend. Connects to the [Ledger](/docs/architecture-ledger) service over gRPC. Provides durability, replication, and cryptographic integrity through Raft consensus.

```yaml
storage: ledger
ledger:
  endpoint: "http://ledger:50051"
```

## Caching

The Engine uses a **two-layer cache** to minimize storage reads:

1. **Relationship cache** — Caches individual relationship lookups. Keyed by `(vault, resource, relation, subject)`.
2. **Evaluation cache** — Caches full check results. Keyed by `(vault, resource, relation, subject, schema_version)`.

Both layers use [Moka](https://github.com/moka-rs/moka), a high-performance concurrent LRU cache. Cache entries are invalidated on relationship writes and schema updates.

Configure caching via:

```yaml
cache:
  enabled: true
  capacity: 100000
  ttl: 300 # seconds
```

## Performance SLOs

| Percentile | Target Latency |
| ---------- | -------------- |
| p50        | < 2 ms         |
| p90        | < 5 ms         |
| p99        | < 10 ms        |
| p99.9      | < 50 ms        |

**Availability target:** 99.9%

These SLOs apply to authorization check operations under normal load. Expansion and list operations may have higher latency depending on graph depth.
