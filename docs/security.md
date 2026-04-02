---
layout: docs
title: Security
doc_title: Security
doc_subtitle: InferaDB's security model, threat mitigations, and defense-in-depth architecture.
---

## Zero-Trust Architecture

InferaDB enforces zero trust: every request is authenticated, authorized, and logged.

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

Every authorization decision is logged to an append-only, hash-chained audit trail:

| Field            | Description                                     |
| ---------------- | ----------------------------------------------- |
| Request params   | Subject, relation, resource                     |
| Result           | ALLOW or DENY                                   |
| Explanation path | The relation traversal that produced the result |
| Policy version   | The IPL schema version used for evaluation      |
| Revision token   | The data revision at time of evaluation         |
| Timestamp        | When the decision was made                      |
| Signature        | Cryptographic signature over the entry          |

Each entry includes the previous entry's hash, making retroactive modification detectable. The chain is anchored in the Ledger's per-vault blockchain.

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

All releases are cryptographically signed:

```bash
inferadb verify v1.2.3
```

### Software Bill of Materials (SBOM)

Every release includes an SBOM in SPDX format.

### Dependency Scanning

Dependencies are scanned for known vulnerabilities in CI.

### Container Image Signing

Container images are signed. Use Kyverno admission policies to enforce signature verification.

### Vulnerability Scanning

All images are scanned with **Trivy** before publication. Critical/high-severity vulnerabilities block release.

## Reporting Security Issues

Do **not** open public issues for security vulnerabilities. Report them to [security@inferadb.com](mailto:security@inferadb.com). See the [security policy](https://github.com/inferadb/inferadb/security/policy) for full details.
