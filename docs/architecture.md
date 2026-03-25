---
layout: docs
title: Architecture — InferaDB
doc_title: Architecture
doc_subtitle: System overview of InferaDB's three-service architecture.
last_updated: 2026-03-24
related:
  - /docs/architecture-engine
  - /docs/architecture-control
  - /docs/architecture-ledger
---

## How It Works

When your application calls `vault.check("user:alice", "can_edit", "document:readme")`:

1. **SDK** sends a gRPC or REST request to the **Engine**
2. **Engine** resolves `can_edit = editor | owner` against the IPL schema, reads relationships from the **Ledger** (or local cache), and returns `ALLOWED` or `DENIED` with a revision token

## Service Overview

InferaDB is composed of three Rust services:

| Service                               | Role          | Ports            | Description                                       |
| ------------------------------------- | ------------- | ---------------- | ------------------------------------------------- |
| [Engine](/docs/architecture-engine)   | Data plane    | 8080, 8081, 8082 | Evaluates authorization checks                    |
| [Control](/docs/architecture-control) | Control plane | 9090, 9091, 9092 | Manages tenants, users, policies, and credentials |
| [Ledger](/docs/architecture-ledger)   | Storage       | 50051            | Persists state with cryptographic integrity       |

## Data Flow

### Authorization Checks

The Engine evaluates authorization requests against the IPL schema and relationship data.

```
Client → Engine (gRPC/REST)
         ├── Check cache (Moka LRU)
         ├── Evaluate IPL policy
         │   └── Read relationships from storage
         └── Return decision + revision token
```

### Administration

Administrative requests flow through the **Control** service.

```
Client → Control (REST)
         ├── Authenticate request (session token or JWT)
         ├── Execute operation
         └── Persist state to Ledger
```

### Engine ↔ Control Independence

The Engine and Control services do **not** communicate directly. They share state through the Ledger:

- **JWKS synchronization** — Control publishes signing keys to the Ledger; the Engine reads them for JWT validation.
- **Both persist to Ledger** — Schema, relationships, tenant config, and audit records all flow through Raft.

The Engine continues serving checks even if Control is temporarily unavailable.

## Multi-Tenancy

InferaDB uses a two-level tenant hierarchy:

```
Organization
└── Vault
    ├── Schema (IPL policy)
    ├── Relationships (tuples)
    ├── Audit log
    └── Encryption scope
```

- **Organizations** — top-level billing and administrative boundary
- **Vaults** — isolated authorization environments with their own schema, relationships, and cryptographic scope

All data is vault-scoped. The Engine enforces strict tenant isolation at every layer.

## Storage Abstraction

Both the Engine and Control use a **storage abstraction trait** with two implementations:

| Backend  | Use Case    | Description                                                     |
| -------- | ----------- | --------------------------------------------------------------- |
| `memory` | Development | In-process storage with sub-microsecond latency, no persistence |
| `ledger` | Production  | Distributed storage via the Ledger service with Raft consensus  |

Select the backend at startup via configuration. The memory backend runs as a single binary with no dependencies; the Ledger backend provides durability, replication, and cryptographic integrity.

## High-Level Diagram

```
┌─────────────┐     ┌─────────────┐
│   Clients   │     │  Dashboard  │
└──────┬──────┘     └──────┬──────┘
       │                   │
       ▼                   ▼
┌─────────────┐     ┌─────────────┐
│   Engine    │     │   Control   │
│ (data plane)│     │(ctrl plane) │
└──────┬──────┘     └──────┬──────┘
       │                   │
       └────────┬──────────┘
                ▼
         ┌─────────────┐
         │   Ledger    │
         │  (storage)  │
         └─────────────┘
```

For detailed internals of each service, see:

- [Engine Architecture](/docs/architecture-engine)
- [Control Architecture](/docs/architecture-control)
- [Ledger Architecture](/docs/architecture-ledger)
