---
layout: docs
title: What is InferaDB? — InferaDB
doc_title: What is InferaDB?
doc_subtitle: A distributed authorization database for fine-grained access control at scale.
---

InferaDB is an inference-driven authorization database that answers the question every application must ask — *"can this user do this?"* — in microseconds.

It unifies **Relationship-Based Access Control (ReBAC)**, **Role-Based Access Control (RBAC)**, and **Attribute-Based Access Control (ABAC)** in a single system, with cryptographic audit trails and multi-tenant isolation at the storage layer.

## Key Capabilities

- **Sub-microsecond performance** — 2.8µs p99 read latency, 952K ops/sec on commodity hardware
- **Cryptographic tenant isolation** — Per-vault AES-256-GCM envelope encryption
- **Tamper-proof audit trail** — Per-vault blockchain with Merkle proof verification
- **Distributed consensus** — Raft-based replication with linearizable writes
- **WebAssembly extensibility** — Custom authorization logic in any WASM-compatible language
- **Standards-compliant** — OpenID AuthZEN-native, Google Zanzibar-inspired

## Architecture

InferaDB consists of three server components:

| Component | Role | Port(s) |
|-----------|------|---------|
| **[Engine](/docs/architecture-engine)** | Authorization evaluation (data plane) | 8080 (REST), 8081 (gRPC), 8082 (mesh) |
| **[Control](/docs/architecture-control)** | Tenant administration (control plane) | 9090 (REST), 9091 (gRPC), 9092 (mesh) |
| **[Ledger](/docs/architecture-ledger)** | Blockchain persistence (storage layer) | 50051 (gRPC) |

## How It Works

1. **Define your model** in the [Infera Policy Language (IPL)](/docs/ipl) — a declarative syntax for entities, relations, and permissions.
2. **Write relationships** (tuples) via the [REST](/docs/api-rest) or [gRPC](/docs/api-grpc) APIs — e.g., `(user:alice, editor, document:readme)`.
3. **Check permissions** — ask "can user X do Y on resource Z?" and get a sub-millisecond answer with a full explanation path.

## Developer Tools

- **[CLI](/docs/cli)** — `inferadb check`, `inferadb simulate`, `inferadb policy branch`
- **[Rust SDK](/docs/sdk-rust)** — Type-safe, async-first client with MockClient for testing
- **[Dashboard](/docs/dashboard)** — Visual policy editor, relationship graph, decision simulator
- **[Terraform Provider](/docs/terraform)** — Manage organizations, vaults, clients as IaC

## Open Source

InferaDB is dual-licensed under [MIT](https://github.com/inferadb/inferadb/blob/main/LICENSE-MIT) and [Apache 2.0](https://github.com/inferadb/inferadb/blob/main/LICENSE-APACHE). The source code is on [GitHub](https://github.com/inferadb).
