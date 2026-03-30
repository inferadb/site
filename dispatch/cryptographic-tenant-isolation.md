---
layout: post
title: "Cryptographic Tenant Isolation: Why Application-Level Multi-Tenancy Isn't Enough"
post_title: "Cryptographic Tenant Isolation: Why Application-Level Multi-Tenancy Isn't Enough"
date: 2026-02-05
category: security
description: "InferaDB encrypts each tenant's data with independent AES-256-GCM keys. Cross-tenant access is architecturally impossible — not just prevented by application logic."
hero: /assets/images/dispatch/tenant-isolation.svg
authors:
  - Jane Sims
---

Every multi-tenant authorization system makes the same promise: **your data is isolated from other tenants.** The question is how that promise is enforced.

In most systems — including every Zanzibar-derived engine we are aware of — tenant isolation is implemented at the application level. A tenant ID is attached to each query. The query layer filters results. All tenants share the same tables, the same indexes, the same encryption keys, and the same physical storage. The isolation guarantee depends entirely on the correctness of the filtering logic.

**One bug in a query path, one missing filter in a new endpoint, one SQL injection that bypasses the tenant check — and data leaks across tenant boundaries.**

## Vaults: Isolation at the Storage Engine Level

InferaDB enforces tenant isolation through **vaults** — independent units of encryption, storage, and consensus. This is not a logical partition. It is a cryptographic boundary.

Every key in the B+ tree is prefixed with the vault's 8-byte identifier, structurally separating data in the key space. But the real isolation comes from encryption: each vault has its own **independent AES-256-GCM envelope encryption hierarchy**.

Here is the key chain:

- A **data encryption key (DEK)** encrypts every page belonging to the vault
- A **key encryption key (KEK)**, unique to the vault, encrypts the DEK

A query executing in the context of vault A **literally cannot decrypt the pages belonging to vault B**, even if a bug in the query layer caused it to read the wrong pages. Cross-tenant data access is not prevented by policy. It is made **architecturally impossible** by the encryption boundary.

## Per-Vault Blockchain: Tamper-Evident Audit

Each vault maintains its own **independent blockchain** — a chain of blocks where each block contains a batch of committed operations and a state root derived from a Merkle tree over the vault's current state.

The state root is a **cryptographic commitment** to the entire contents of the vault at that point in time. Any modification to any piece of data changes the state root, making tampering with the audit trail detectable. The chain is append-only; you cannot rewrite history without invalidating every subsequent block.

Because each vault's blockchain is independent, the audit history of one tenant **cannot be influenced by operations on another tenant**. An auditor verifying the integrity of tenant A's access history does not need to process — or even be aware of — tenant B's data. This is a property that shared-table architectures fundamentally cannot provide.

## Cryptographic Shredding: GDPR Article 17 Done Right

GDPR Article 17 grants individuals the right to erasure. Most systems implement this with row-level deletion — which leaves data lingering in backups, write-ahead logs, and filesystem slack space. Proving complete deletion becomes an exercise in hope.

InferaDB uses **cryptographic shredding**. When a tenant requests data deletion, InferaDB destroys the vault's key encryption key. Without the KEK, the DEK cannot be recovered. Without the DEK, the encrypted pages are **indistinguishable from random bytes**.

The data is irrecoverable by any party, including InferaDB's operators.

This approach has three properties that row-level deletion cannot match:

- **Instantaneous.** Destroying a key is a constant-time operation regardless of data volume. A vault with 10 bytes and a vault with 10 terabytes are shredded in the same time.
- **Provably complete.** The encryption is the only means of accessing the data. No key, no data. There is nothing to miss.
- **Audit-friendly.** Key destruction is a logged, verifiable event. You can prove to a regulator exactly when the data became irrecoverable.

## Data Residency: Region-Pinned Raft Groups

Regulations like GDPR, DORA, and national data sovereignty laws require that certain data be stored within specific geographic boundaries. InferaDB supports this through **region-pinned Raft groups**: a vault's Raft group can be configured to include only nodes within a specific region.

This is enforcement at the infrastructure level. The vault's data **physically cannot leave the designated region** because the consensus protocol does not replicate it to nodes outside that region. There is no policy annotation that depends on operational procedures. There is no "please configure your deployment correctly." The architecture enforces it.

Combined with per-vault encryption, each tenant's data is both **cryptographically isolated and geographically constrained** — with both guarantees enforced by system architecture rather than application code.

## The Difference Between "Prevented" and "Impossible"

Application-level tenant isolation means cross-tenant access is **prevented** — as long as every line of filtering code is correct, every new endpoint remembers to include the tenant check, and no exploit bypasses the query layer.

Cryptographic tenant isolation means cross-tenant access is **impossible** — because the data is encrypted with keys that only the owning tenant's context can access. The distinction matters most when things go wrong: when there is a bug, when there is an exploit, when a new engineer ships a query without the tenant filter.

In those moments, "prevented" fails and "impossible" holds.

---

Want to see how vaults work in practice? **[Explore the documentation](/docs/)** or **[get started with InferaDB](/docs/quickstart)** to create your first vault.
