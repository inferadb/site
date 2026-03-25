---
layout: docs
title: Troubleshooting — InferaDB
doc_title: Troubleshooting
doc_subtitle: Debug unexpected authorization decisions.
---

## Unexpected DENIED

Your check returned `DENIED` when you expected `ALLOWED`.

### 1. Verify the Relationship Exists

```bash
inferadb relationships list --resource document:readme --subject user:alice
```

If missing, the relationship was never written or was written to a different vault.

### 2. Check the Schema

```bash
inferadb schemas diff
```

Verify your schema has been pushed. Common mistake: editing `schema.ipl` locally without running `inferadb schemas push`.

### 3. Trace the Permission

```bash
inferadb explain-permission document:readme can_edit user:alice
```

Shows the full evaluation tree. Look for:

- **Missing intermediate relationships** — `viewer from folder` requires both a `folder` relation on the document AND a `viewer` relation on that folder
- **Forbid rules** — a matching `forbid` overrides all permits
- **WASM module returning deny** — check logs with `inferadb dev logs engine`

### 4. Check Revision Freshness

```bash
inferadb check document:readme can_edit user:alice --revision latest
```

If this succeeds but the original check failed, your client is holding a stale revision token.

**Fix:** Pass the write response token to subsequent reads using `at_least_as_fresh`.

### 5. Check Vault Scope

```bash
inferadb whoami
```

Confirm the correct organization and vault. A JWT scoped to Vault A cannot see Vault B relationships.

## Unexpected ALLOWED

Your check returned `ALLOWED` when you expected `DENIED`.

### 1. Check for Wildcards

```bash
inferadb relationships list --resource document:readme --subject "user:*"
```

A wildcard grant (`user:*`) gives all users the relation. Common for public resources but easy to set accidentally.

### 2. Trace the Permission

```bash
inferadb explain-permission document:readme can_view user:bob
```

Check which branch matched. Common surprises:

- **Inherited access** — a forgotten `viewer from folder` or `member from org` grant
- **Union (`|`) is additive** — any single branch granting access means ALLOWED
- **WASM module returning allow** — the module may approve on unexpected context

### 3. Check for Missing Forbid Rules

If a user should be denied, verify the forbid relation exists:

```bash
inferadb relationships list --resource document:readme --relation suspended --subject user:bob
```

Forbid rules only trigger if the relationship tuple exists.

## Indeterminate Results

Exit code `21` means the check couldn't resolve. Usually indicates:

- **Schema cycle** — run `inferadb schemas validate` to detect
- **WASM module timeout** — check engine logs for `wasm_timeout`
- **Ledger unavailable** — Engine couldn't reach Ledger for fresh data

```bash
inferadb dev logs engine | grep -i "error\|timeout\|unavailable"
```

## Common Mistakes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Check denied after writing relationship | Stale revision token | Pass write response token to read |
| All checks denied | Wrong vault scope | Verify `inferadb whoami` matches your data |
| Check allowed for wrong user | Wildcard grant `user:*` | Remove wildcard or add forbid |
| `viewer from folder` not resolving | Missing `folder` relation on document | Add `document:X folder folder:Y` tuple |
| WASM check always denied | Module returning 0 | Debug module with `host.log`, check sandbox limits |
| Schema push succeeded but checks fail | Old schema cached | Restart Engine or wait for cache TTL (default 60s) |

## Diagnostic Commands Reference

| Command | Purpose |
|---------|---------|
| `inferadb explain-permission <resource> <perm> <subject>` | Full evaluation trace |
| `inferadb relationships list --resource <r> --subject <s>` | List matching tuples |
| `inferadb simulate --add/--remove ... --check ...` | Test hypothetical changes |
| `inferadb schemas validate schema.ipl` | Check schema for errors/cycles |
| `inferadb schemas diff` | Compare local schema to deployed |
| `inferadb dev logs engine` | Engine logs (errors, WASM, cache) |
| `inferadb whoami` | Current auth context (org, vault) |
| `inferadb stats` | Vault statistics (tuple count, schema version) |

## What's Next?

- [Core Concepts](/docs/concepts) — Review entities, tuples, and revision tokens
- [CLI Reference](/docs/cli) — All diagnostic commands in detail
- [Observability](/docs/observability) — Set up Prometheus metrics and tracing for production debugging
