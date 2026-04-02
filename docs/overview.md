---
layout: docs
title: What is InferaDB?
doc_title: What is InferaDB?
doc_subtitle: A distributed authorization database for fine-grained access control at scale.
last_updated: 2026-03-24
related:
  - /docs/quickstart
  - /docs/concepts
  - /docs/architecture
---

InferaDB is a distributed authorization database. It answers *"can this user do this?"* in microseconds, unifying ReBAC, RBAC, and ABAC with cryptographic audit trails and per-tenant storage isolation.

## Key Capabilities

- **Sub-microsecond performance** — 2.8µs p99 read latency, 952K ops/sec on commodity hardware
- **Cryptographic tenant isolation** — Per-vault AES-256-GCM envelope encryption
- **Tamper-proof audit trail** — Per-vault blockchain with Merkle proof verification
- **Distributed consensus** — Raft-based replication with linearizable writes
- **WebAssembly extensibility** — Custom authorization logic in any WASM-compatible language
- **Standards-compliant** — OpenID AuthZEN-native, Google Zanzibar-inspired

## Architecture

Three server components:

| Component | Role | Port(s) |
|-----------|------|---------|
| **[Engine](/docs/architecture-engine)** | Authorization evaluation (data plane) | 8080 (REST), 8081 (gRPC), 8082 (mesh) |
| **[Control](/docs/architecture-control)** | Tenant administration (control plane) | 9090 (REST), 9091 (gRPC), 9092 (mesh) |
| **[Ledger](/docs/architecture-ledger)** | Blockchain persistence (storage layer) | 50051 (gRPC) |

## How It Works

1. **Define your model** in the [Infera Policy Language (IPL)](/docs/ipl) — entities, relations, and permissions.
2. **Write relationships** (tuples) via [REST](/docs/api-rest) or [gRPC](/docs/api-grpc) — e.g., `(user:alice, editor, document:readme)`.
3. **Check permissions** — sub-millisecond answers with full explanation paths.

## Tooling

- **[CLI](/docs/cli)** — `inferadb check`, `inferadb simulate`, `inferadb policy branch`
- **[Rust SDK](/docs/sdk-rust)** — Type-safe, async-first client with MockClient for testing
- **[Dashboard](/docs/dashboard)** — Visual policy editor, relationship graph, decision simulator
- **[Terraform Provider](/docs/terraform)** — Manage organizations, vaults, clients as IaC

## Open Source

Dual-licensed under [MIT](https://github.com/inferadb/inferadb/blob/main/LICENSE-MIT) and [Apache 2.0](https://github.com/inferadb/inferadb/blob/main/LICENSE-APACHE). Source on [GitHub](https://github.com/inferadb).
