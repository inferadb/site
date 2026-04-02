---
layout: docs
title: Core Concepts
doc_title: Core Concepts
doc_subtitle: The foundational ideas behind InferaDB's authorization model.
last_updated: 2026-03-24
related:
  - /docs/ipl
  - /docs/modeling
  - /docs/overview
---

## Authorization Models

InferaDB supports three authorization models simultaneously. Mix and match within a single schema.

### Relationship-Based Access Control (ReBAC)

Permissions derive from **relationships between entities** — "Alice is an editor of Document X" or "Alice is a member of Team Y, which has access to Folder Z."

```
type document {
    relation viewer
    relation editor
    relation can_view = viewer | editor
}
```

{% include diagram-rebac.html %}

ReBAC supports arbitrarily nested hierarchies without role explosion.

### Role-Based Access Control (RBAC)

Role assignments are modeled as relationships: `(user:alice, admin, organization:x)`.

### Attribute-Based Access Control (ABAC)

Contextual checks run in sandboxed [WASM modules](/docs/wasm) — IP ranges, subscription tiers, time windows, or any domain-specific attribute.

## Entities and Types

An **entity** is any object in your system — a user, document, team, or organization. Each entity has a **type and ID** in the format `type:id` (e.g., `user:alice`, `document:readme`).

**Types** are defined in your [IPL schema](/docs/ipl). Each type declares its relations:

```
type document {
    relation viewer
    relation editor
    relation owner
}
```

## Relationships (Tuples)

A **relationship** (tuple) is a fact: `(subject, relation, resource)`.

- `(user:alice, editor, document:readme)` — Alice is an editor of the readme
- `(team:engineering, viewer, folder:specs)` — Engineering can view specs
- `(user:*, viewer, document:public-faq)` — Wildcard: all users can view the FAQ

Relationships are stored in the [Ledger](/docs/architecture-ledger) and cryptographically committed to a per-vault blockchain.

## Permissions (Computed Relations)

**Permissions** are computed relations — expressions over other relations:

```
type document {
    relation viewer
    relation editor
    relation owner
    relation can_view = viewer | editor | owner
    relation can_edit = editor | owner
    relation can_delete = owner
}
```

### Set Operations

| Operator     | Syntax   | Meaning                                  |
| ------------ | -------- | ---------------------------------------- |
| Union        | `a \| b` | Access if **any** branch grants it       |
| Intersection | `a & b`  | Access only if **all** branches grant it |
| Exclusion    | `a - b`  | Access if `a` grants but `b` does not    |

### Computed Usersets

```
relation can_view = editor   // editors can also view
```

### Tuple-to-Userset (Inherited Permissions)

Follow a relation to another entity, then check a relation there:

```
type document {
    relation parent         // points to a folder
    relation inherited_view = viewer from parent
}
```

If `document:readme` has `parent -> folder:specs` and Alice is a `viewer` of `folder:specs`, she inherits `inherited_view` on the document.

## Forbid Rules

**Forbid** rules are explicit denies evaluated **before** permits. Any matching forbid results in `DENY` regardless of other permissions.

```
type document {
    relation viewer
    forbid suspended    // suspended users are always denied
    relation can_view = viewer
}
```

## Revision Tokens

Every authorization decision references a **revision token** — a monotonically increasing snapshot identifier for the relationship graph.

This solves the [Zanzibar](https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/) **"new enemy problem"**: if Alice revokes Bob's access at T=10:00:00 and Bob's request at T=10:00:01 hits a stale replica, he incorrectly retains access. Revision tokens prevent this.

### How to Use Revision Tokens

1. **Write a relationship** → receive a revision token in the response
2. **Pass the token** to subsequent reads → `at_least_as_fresh(token)`
3. **Propagate between services** → pass tokens in headers for causal consistency

## Multi-Tenancy

Two-level tenant isolation:

- **Organization** — A tenant account (company, team)
- **Vault** — An isolated namespace within an organization

Each vault has its own blockchain, encryption keys, and relationship graph. Cross-vault queries are architecturally impossible — isolation is at the storage layer, not application logic.

## WASM Modules

For logic beyond declarative rules, InferaDB runs [WebAssembly modules](/docs/wasm) in a deterministic sandbox with no I/O, network, or filesystem access.
