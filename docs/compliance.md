---
layout: docs
title: Compliance — InferaDB
doc_title: Compliance
doc_subtitle: How InferaDB maps to common regulatory and compliance frameworks.
---

## Overview

InferaDB's architecture — immutable audit trails, cryptographic integrity, fine-grained access control, and tenant isolation — maps directly to requirements in major compliance frameworks. This page documents the specific controls and how InferaDB addresses them.

## Framework Mapping

### SOC 2

| Control | Requirement             | InferaDB Implementation                                              |
| ------- | ----------------------- | -------------------------------------------------------------------- |
| CC6.1   | Logical access security | Vault-scoped tokens, Ed25519 JWT authentication, RBAC/ReBAC policies |
| CC7.2   | System monitoring       | Hash-chained audit trail, Prometheus metrics, OpenTelemetry tracing  |

### HIPAA

| Section     | Requirement    | InferaDB Implementation                                                    |
| ----------- | -------------- | -------------------------------------------------------------------------- |
| §164.312(a) | Access control | Fine-grained ReBAC/RBAC/ABAC, vault-scoped tenant isolation                |
| §164.312(b) | Audit controls | Every authorization decision logged with full context and crypto signature |

### GDPR

| Article | Requirement                      | InferaDB Implementation                                                    |
| ------- | -------------------------------- | -------------------------------------------------------------------------- |
| Art. 25 | Data protection by design        | Per-tenant encryption, vault isolation, least-privilege tokens             |
| Art. 30 | Records of processing activities | Immutable audit trail with decision parameters, policy version, timestamps |

### PCI DSS

| Requirement | Description                     | InferaDB Implementation                                         |
| ----------- | ------------------------------- | --------------------------------------------------------------- |
| Req 7       | Restrict access by need-to-know | Relationship-based access control, vault-scoped permissions     |
| Req 10      | Track access to resources       | Hash-chained audit log, cryptographic signatures on every entry |

### NIS2

| Requirement     | Description                        | InferaDB Implementation                                            |
| --------------- | ---------------------------------- | ------------------------------------------------------------------ |
| Access controls | Risk-appropriate access management | Fine-grained authorization policies (ReBAC/RBAC/ABAC)              |
| Zero-trust      | Assume breach posture              | mTLS between services, per-request authentication, vault isolation |

### DORA

| Requirement           | Description                 | InferaDB Implementation                                        |
| --------------------- | --------------------------- | -------------------------------------------------------------- |
| Access policies       | ICT access control policies | IPL-defined authorization policies, vault-scoped tokens        |
| Continuous monitoring | Ongoing risk monitoring     | Prometheus metrics, audit log streaming, OpenTelemetry tracing |

### EU AI Act

| Requirement     | Description                    | InferaDB Implementation                                                     |
| --------------- | ------------------------------ | --------------------------------------------------------------------------- |
| Human oversight | Ability to review AI decisions | Decision simulator, expansion traces, audit explorer                        |
| Logging         | Record-keeping for AI systems  | Every evaluation logged with input parameters, result, and explanation path |

## Audit Trail

The audit trail is the foundation of InferaDB's compliance story. Every authorization decision produces an audit entry containing:

| Field            | Description                                      |
| ---------------- | ------------------------------------------------ |
| Request params   | Subject, relation, resource, context             |
| Result           | ALLOW or DENY                                    |
| Explanation path | Full relation traversal that produced the result |
| Policy version   | IPL schema version used for evaluation           |
| Revision token   | Data revision at time of evaluation              |
| Timestamp        | Decision timestamp                               |
| Crypto signature | Ed25519 signature over the entry                 |

### Integrity Properties

- **Append-only** — Entries cannot be modified or deleted after creation
- **Hash-chained** — Each entry includes the hash of the previous entry, forming a tamper-evident chain
- **Anchored** — The chain is committed to the Ledger's per-vault blockchain

These properties mean any attempt to modify historical audit data would break the hash chain, making tampering detectable.

## Cryptographic Shredding

For GDPR Article 17 (Right to Erasure), InferaDB supports **cryptographic shredding**. Each vault's data is encrypted with a vault-specific key. Deleting the key renders all vault data unrecoverable without needing to locate and delete individual records.

## Data Residency

InferaDB enforces data residency at the vault level. Vaults are pinned to a specific region using the Ledger's region-based Raft groups:

```bash
# Create a vault pinned to EU region
inferadb vaults create --name "eu-customers" --region eu-west-1
```

Data for a region-pinned vault is only stored on Ledger nodes within that region. This satisfies GDPR data residency requirements and similar regulations that mandate geographic data boundaries.

See [Ledger Architecture](/docs/architecture-ledger) for details on multi-region Raft groups.
