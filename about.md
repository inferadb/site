---
title: About
header: About InferaDB
subtitle: The authorization database for modern applications.
layout: page
---

**InferaDB** is an inference-driven authorization database that unifies relationship-based access control (ReBAC), logical policy reasoning, and AuthZEN interoperability into a single, high-performance system.

Authorization shouldn't be fragile. Traditional RBAC and ABAC systems fragment under distributed, multi-tenant architectures. Developers hardcode access rules, deploy unverified policies, or rely on brittle role-based systems that break under real-world resource graphs.

InferaDB addresses these challenges by modeling authorization as a graph of relationships and logical inferences — not just static roles or attributes.

## Design Philosophy

Five principles guide InferaDB's design:

- **Inference as a Primitive** — Authorization is derived from reasoning, not static checks. Each decision represents a provable inference derived from relationships, policies, and conditions.
- **Consistency Above All** — Strongly consistent reads and writes ensure deterministic outcomes under high concurrency.
- **Composable Policy Logic** — Policies are declarative, modular, and composable. Developers can extend logic safely through sandboxed WASM modules.
- **Developer-Centric Experience** — Authorization should be understandable, testable, and observable. Tooling matters as much as throughput.
- **Transparent Trust** — Every decision is auditable, signed, and replayable. Determinism is verifiable through revision tokens and tamper-evident logs.

## Architecture

InferaDB consists of three server components:

- **[Engine](https://github.com/inferadb/engine)** — The core authorization engine, built in Rust for low latency and strong consistency.
- **[Control](https://github.com/inferadb/control)** — The multi-tenant administration plane with WebAuthn authentication.
- **[Ledger](https://github.com/inferadb/ledger)** — The distributed blockchain persistence layer for cryptographic audit trails.

## Open Source

InferaDB is dual-licensed under [MIT](https://github.com/inferadb/inferadb/blob/main/LICENSE-MIT) and [Apache 2.0](https://github.com/inferadb/inferadb/blob/main/LICENSE-APACHE). We believe authorization infrastructure should be transparent, auditable, and community-driven.

## Community

Join us on [Discord](https://discord.gg/inferadb) for questions, discussions, and contributions. We'd love to hear from you.
