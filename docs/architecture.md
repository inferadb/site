---
layout: docs
title: Architecture — InferaDB
doc_title: Architecture
doc_subtitle: System overview of InferaDB's three-service architecture.
---

## Service Overview

InferaDB is composed of three Rust services, each with a distinct responsibility:

| Service                               | Role          | Ports            | Description                                       |
| ------------------------------------- | ------------- | ---------------- | ------------------------------------------------- |
| [Engine](/docs/architecture-engine)   | Data plane    | 8080, 8081, 8082 | Evaluates authorization checks                    |
| [Control](/docs/architecture-control) | Control plane | 9090, 9091, 9092 | Manages tenants, users, policies, and credentials |
| [Ledger](/docs/architecture-ledger)   | Storage       | 50051            | Persists state with cryptographic integrity       |

## Data Flow

### Authorization Checks

Clients send authorization requests to the **Engine**. The Engine evaluates the request against the loaded IPL schema and relationship data, returning an ALLOW or DENY decision.

```
Client → Engine (gRPC/REST)
         ├── Check cache (Moka LRU)
         ├── Evaluate IPL policy
         │   └── Read relationships from storage
         └── Return decision + revision token
```

### Administration

Clients send administrative requests — creating organizations, managing users, issuing tokens — to the **Control** service.

```
Client → Control (REST)
         ├── Authenticate request (session token or JWT)
         ├── Execute operation
         └── Persist state to Ledger
```

### Engine ↔ Control Independence

The Engine and Control services do **not** communicate directly over HTTP. Instead, they share state through the Ledger:

- **JWKS synchronization** — The Control service publishes signing keys to the Ledger. The Engine reads them from the Ledger for JWT validation. This eliminates a runtime HTTP dependency between the two services.
- **Both persist to Ledger** — Schema data, relationships, tenant configuration, and audit records all flow through the Ledger's Raft consensus protocol.

This design means the Engine can continue serving authorization checks even if the Control service is temporarily unavailable.

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

- **Organizations** are the top-level billing and administrative boundary
- **Vaults** are isolated authorization environments within an organization, each with its own schema, relationship data, and cryptographic scope

All data is vault-scoped. A request to the Engine always targets a specific vault, and the Engine enforces strict tenant isolation at every layer.

## Storage Abstraction

Both the Engine and Control share a common **storage abstraction trait**. This trait has two implementations:

| Backend  | Use Case    | Description                                                     |
| -------- | ----------- | --------------------------------------------------------------- |
| `memory` | Development | In-process storage with sub-microsecond latency, no persistence |
| `ledger` | Production  | Distributed storage via the Ledger service with Raft consensus  |

The storage backend is selected at startup via configuration. In development, the memory backend lets you run the Engine as a single binary with no external dependencies. In production, the Ledger backend provides durability, replication, and cryptographic integrity.

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
