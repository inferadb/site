---
layout: docs
title: Engine Architecture — InferaDB
doc_title: Engine Architecture
doc_subtitle: Deep dive into InferaDB's data plane — the authorization evaluation engine.
---

## Overview

The Engine is InferaDB's **data plane**. It evaluates authorization requests against IPL policies and stored relationships, returning ALLOW or DENY decisions. Written in Rust for low-latency, high-throughput operation.

## Crate Structure

Internal crates:

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

Six services exposed through the API layer:

### EvaluationService

`Check` and `BatchCheck`. Parses IPL into an evaluation plan, traverses the relationship graph, returns a decision with a revision token.

### ExpansionService

Expands a computed relation into the full tree of contributing relations and entities. Powers the Dashboard's decision trace view.

### RelationshipService

CRUD for relationship tuples. Writes are forwarded to the Ledger.

### ResourceService

Lists resources accessible to a subject via a given relation.

### SubjectService

Lists subjects with a given relation to a resource.

### WatchService

Streams real-time relationship change events for client-side cache invalidation.

## Listen Ports

Three listen ports:

| Port | Protocol | Purpose                                   |
| ---- | -------- | ----------------------------------------- |
| 8080 | HTTP     | REST API and health checks                |
| 8081 | gRPC     | gRPC API for authorization checks         |
| 8082 | HTTP     | Mesh/internal endpoint for peer discovery |

## Storage Backends

### Memory

In-process concurrent hash maps. Sub-microsecond reads, no external dependencies. Data does not survive restarts.

```yaml
storage: memory
```

### Ledger

Production backend. Connects to the [Ledger](/docs/architecture-ledger) over gRPC for durability, replication, and cryptographic integrity.

```yaml
storage: ledger
ledger:
  endpoint: "http://ledger:50051"
```

## Caching

Two-layer [Moka](https://github.com/moka-rs/moka) LRU cache, invalidated on writes and schema updates:

1. **Relationship cache** — keyed by `(vault, resource, relation, subject)`
2. **Evaluation cache** — keyed by `(vault, resource, relation, subject, schema_version)`

Configuration:

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

SLOs apply to check operations under normal load. Expansion and list operations vary with graph depth.
