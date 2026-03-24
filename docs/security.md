---
layout: docs
title: Security — InferaDB
doc_title: Security
doc_subtitle: InferaDB's security model, threat mitigations, and defense-in-depth architecture.
---

## Zero-Trust Architecture

InferaDB is built on a zero-trust security model. No component implicitly trusts another — every request is authenticated, every action is authorized, and every decision is logged.

## Threat Model

| Threat                   | Mitigation                                  |
| ------------------------ | ------------------------------------------- |
| Unauthorized data access | Per-tenant encryption, vault-scoped tokens  |
| Policy tampering         | Cryptographic signatures on policy versions |
| Malicious WASM modules   | Wasmtime sandbox with resource limits       |
| Audit log manipulation   | Hash-chained, append-only audit trail       |
| Network interception     | mTLS between all services                   |
| Privilege escalation     | Least-privilege, vault-scoped JWT tokens    |

## Defense in Depth

### Tenant Isolation

All data in InferaDB is **vault-scoped**. A vault is the fundamental isolation boundary:

- Each vault has its own schema, relationships, audit log, and encryption scope
- JWT tokens are scoped to a single vault — a token issued for Vault A cannot access Vault B
- Storage keys are prefixed with the vault ID, preventing cross-tenant data access at the storage layer
- The Engine validates vault scope on every request before evaluation begins

### Immutable Audit Trail

Every authorization decision is logged to an append-only, hash-chained audit trail. Each entry contains:

| Field            | Description                                     |
| ---------------- | ----------------------------------------------- |
| Request params   | Subject, relation, resource                     |
| Result           | ALLOW or DENY                                   |
| Explanation path | The relation traversal that produced the result |
| Policy version   | The IPL schema version used for evaluation      |
| Revision token   | The data revision at time of evaluation         |
| Timestamp        | When the decision was made                      |
| Signature        | Cryptographic signature over the entry          |

Entries are hash-chained — each entry includes the hash of the previous entry, making retroactive modification detectable. The chain is anchored in the Ledger's per-vault blockchain.

### WASM Sandbox Security

[WASM modules](/docs/wasm) for ABAC conditions run inside a Wasmtime sandbox with strict resource limits:

- **Memory** — Bounded allocation; modules cannot consume unbounded memory
- **CPU** — Execution fuel limits prevent infinite loops
- **No network access** — WASM modules cannot make outbound network calls
- **No filesystem access** — WASM modules cannot read or write files
- **Deterministic execution** — No access to system clock or random number generators within the sandbox

Modules are validated at upload time and rejected if they import disallowed host functions.

## Supply Chain Security

### Signed Releases

All InferaDB releases are cryptographically signed. Verify release signatures before deploying:

```bash
inferadb verify v1.2.3
```

### Software Bill of Materials (SBOM)

Every release ships with an SBOM in SPDX format, listing all dependencies and their versions.

### Dependency Scanning

Dependencies are continuously scanned for known vulnerabilities using automated tooling in CI.

### Container Image Signing

Container images are signed and can be verified using admission controllers:

- **Kyverno** policies enforce that only signed InferaDB images are admitted to the cluster
- Image signatures are published alongside each release

### Vulnerability Scanning

All container images are scanned with **Trivy** before publication. Images with critical or high-severity vulnerabilities are not released.

## Reporting Security Issues

Do **not** open public issues for security vulnerabilities. Report them to [security@inferadb.com](mailto:security@inferadb.com). See the [security policy](https://github.com/inferadb/inferadb/security/policy) for full details.
