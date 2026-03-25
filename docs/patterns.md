---
layout: docs
title: Schema Patterns — InferaDB
doc_title: Schema Patterns
doc_subtitle: Reusable recipes for common authorization models.
---

## Organization → Team → Resource

Hierarchical access: team members inherit resource access, org admins inherit everything.

```
type user {}

type organization {
    relation admin
    relation member
}

type team {
    relation org
    relation member
    relation can_manage = member | admin from org
}

type project {
    relation team
    relation can_view = member from team | admin from team->org
    relation can_edit = can_manage from team
}
```

**When to use:** Multi-tenant SaaS where organizations contain teams that own resources.

## Folder Hierarchy (Recursive Inheritance)

Permissions propagate down through nested folders to documents.

```
type folder {
    relation parent       // another folder (or omit for root)
    relation viewer
    relation editor
    relation can_view = viewer | editor | can_view from parent
    relation can_edit = editor | can_edit from parent
}

type document {
    relation folder
    relation viewer
    relation editor
    relation can_view = viewer | editor | can_view from folder
    relation can_edit = editor | can_edit from folder
}
```

**When to use:** File systems, CMS hierarchies, nested resource trees.

**Watch out:** Deep nesting increases evaluation depth. InferaDB short-circuits on first match, so cost scales with depth to the nearest granting ancestor.

## Shared Resources (Direct + Inherited)

Combine per-user sharing with inherited container permissions.

```
type document {
    relation folder
    relation viewer
    relation editor
    relation owner
    relation can_view = viewer | editor | owner | viewer from folder
    relation can_edit = editor | owner | editor from folder
}
```

**When to use:** Google Drive, Notion, or any system with both individual and container-based sharing.

## Conditional Access (ABAC via WASM)

Restrict access based on runtime context: IP ranges, time windows, subscription tiers.

```
type resource {
    relation viewer
    relation can_view = viewer & module("check_conditions")
}
```

The WASM module receives the full evaluation context and can inspect custom fields passed via `with_context()`.

**When to use:** Geo-fencing, business hours, tiered pricing, temporary access windows.

**Prefer intersection (`&`) over standalone WASM.** The relationship check gates WASM execution — cheaper and more auditable.

## Public Resources (Wildcards)

Grant access to all entities of a type:

```bash
inferadb relationships add "user:*" viewer document:public-faq
```

**When to use:** Public pages, free-tier content, default permissions.

**Watch out:** Wildcard grants cannot be overridden by exclusion (`-`). Use `forbid` rules to deny specific users:

```
type document {
    relation viewer
    forbid blocked
    relation can_view = viewer
}
```

## Mutual Exclusion (Separation of Duties)

Prevent the same user from holding conflicting roles.

```
type payment {
    relation initiator
    relation approver
    relation can_approve = approver - initiator
}
```

**When to use:** Financial controls, compliance workflows, four-eyes principle.

## Temporal Access (WASM)

Grant access only during specific time windows.

```
type shift_resource {
    relation assigned
    relation can_access = assigned & module("check_shift_hours")
}
```

**When to use:** Healthcare shift access, time-limited API keys, scheduled maintenance windows.

## Anti-Patterns

### Don't: Model permissions as direct relations

```
// ✗ Hard to audit, no composability
type document {
    relation can_view    // stored directly as tuples
    relation can_edit    // stored directly as tuples
}
```

Store **who** (viewer, editor, owner), compute **what** (can_view, can_edit).

### Don't: Use exclusion where forbid is clearer

```
// ✗ Confusing — exclusion depends on evaluation order
relation can_view = viewer - suspended

// ✓ Clear — forbid always wins
forbid suspended
relation can_view = viewer
```

`forbid` is evaluated before all permits and appears in `explain-permission` output.

### Don't: Deep WASM chains

```
// ✗ Every check runs 3 WASM modules — slow, hard to debug
relation can_view = viewer & module("a") & module("b") & module("c")
```

Consolidate into a single WASM module. Each invocation has ~1-2ms sandbox startup overhead.

## What's Next?

- [Modeling Guide](/docs/modeling) — Build a complete schema step by step
- [Schema Reference](/docs/ipl-reference) — Full syntax and evaluation semantics
- [WASM Modules](/docs/wasm) — Write custom authorization logic
