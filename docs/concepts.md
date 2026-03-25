---
layout: docs
title: Core Concepts — InferaDB
doc_title: Core Concepts
doc_subtitle: The foundational ideas behind InferaDB's authorization model.
last_updated: 2026-03-24
related:
  - /docs/ipl
  - /docs/modeling
  - /docs/overview
---

## Authorization Models

InferaDB supports three authorization models simultaneously — you can mix and match within a single schema.

### Relationship-Based Access Control (ReBAC)

Permissions are derived from **relationships between entities**. Instead of "Alice has the editor role," you model "Alice is an editor of Document X" or "Alice is a member of Team Y, which has access to Folder Z."

```
type document {
    relation viewer
    relation editor
    relation can_view = viewer | editor
}
```

{% include diagram-rebac.html %}

ReBAC supports arbitrarily complex hierarchies — teams within teams, nested resources, inherited permissions — without role explosion.

### Role-Based Access Control (RBAC)

Traditional role assignments are modeled as relationships. "Alice is an admin of Organization X" is the tuple `(user:alice, admin, organization:x)`.

### Attribute-Based Access Control (ABAC)

Custom conditions and contextual checks are handled via [WASM modules](/docs/wasm) — sandboxed logic that can inspect IP ranges, subscription tiers, time windows, or any domain-specific attribute.

## Entities and Types

An **entity** is any object in your system — a user, a document, a team, an organization. Entities are identified by a **type and ID** in the format `type:id` (e.g., `user:alice`, `document:readme`).

**Types** are defined in your [IPL schema](/docs/ipl). Each type declares its relations:

```
type document {
    relation viewer
    relation editor
    relation owner
}
```

## Relationships (Tuples)

A **relationship** (or tuple) is a statement of fact: _"this subject has this relation to this resource."_

Format: `(subject, relation, resource)`

Examples:

- `(user:alice, editor, document:readme)` — Alice is an editor of the readme document
- `(team:engineering, viewer, folder:specs)` — The engineering team can view the specs folder
- `(user:*, viewer, document:public-faq)` — All users can view the public FAQ (wildcard)

Relationships are stored in the [Ledger](/docs/architecture-ledger) and cryptographically committed to a per-vault blockchain.

## Permissions (Computed Relations)

**Permissions** are computed relations defined as expressions over other relations:

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

Reference another relation on the same type:

```
relation can_view = editor   // editors can also view
```

### Tuple-to-Userset (Inherited Permissions)

Follow a relationship to another entity, then check a relation there:

```
type document {
    relation parent         // points to a folder
    relation inherited_view = viewer from parent
}
```

If `document:readme` has `parent → folder:specs`, and `user:alice` is a `viewer` of `folder:specs`, then Alice inherits `inherited_view` on `document:readme`.

## Forbid Rules

**Forbid** rules are explicit deny rules that override all permits. They are evaluated **before** permit rules — if any forbid matches, the result is `DENY` regardless of other permissions.

```
type document {
    relation viewer
    forbid suspended    // suspended users are always denied
    relation can_view = viewer
}
```

## Revision Tokens

Every authorization decision references a **revision token** — a monotonically increasing identifier representing a consistent snapshot of the relationship graph.

This solves the **"new enemy problem"** from the [Google Zanzibar paper](https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/): if Alice revokes Bob's access at T=10:00:00 and Bob's request at T=10:00:01 hits a stale replica, he would incorrectly retain access. Revision tokens prevent this.

### How to Use Revision Tokens

1. **Write a relationship** → receive a revision token in the response
2. **Pass the token** to subsequent reads → `at_least_as_fresh(token)`
3. **Propagate between services** → pass tokens in headers for causal consistency

## Multi-Tenancy

InferaDB isolates tenants through a two-level hierarchy:

- **Organization** — A tenant account (company, team)
- **Vault** — An isolated data namespace within an organization

Each vault maintains its own blockchain, encryption keys, and relationship graph. Cross-vault queries are architecturally impossible — isolation is enforced at the storage layer, not by application logic.

## WASM Modules

For authorization logic that goes beyond declarative rules — IP ranges, subscription tiers, compliance checks, time-based access — InferaDB supports [WebAssembly modules](/docs/wasm) that execute in a deterministic, sandboxed environment with no I/O, network, or filesystem access.
