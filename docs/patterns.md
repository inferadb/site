---
layout: docs
title: Schema Patterns — InferaDB
doc_title: Schema Patterns
doc_subtitle: Reusable recipes for common authorization models.
---

## Organization → Team → Resource

Grant access through organizational hierarchy. Team members inherit access to team resources, org admins inherit access to everything.

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

Documents inherit permissions from their parent folder. Folders can nest inside other folders.

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

**Watch out:** Deep nesting increases evaluation depth. InferaDB short-circuits on first match, so performance is bounded by the depth to the first granting ancestor — not total tree depth.

## Shared Resources (Direct + Inherited)

Allow both direct grants (sharing a document with a specific user) and inherited grants (through team or folder membership).

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

**When to use:** Google Drive, Notion, any system where resources can be shared individually or through containers.

## Conditional Access (ABAC via WASM)

Restrict access based on runtime context — IP ranges, time windows, subscription tiers — while keeping the core model relationship-based.

```
type resource {
    relation viewer
    relation can_view = viewer & module("check_conditions")
}
```

The WASM module receives the full evaluation context (subject, resource, permission) and can inspect custom fields passed via `with_context()`.

**When to use:** Compliance requirements (geo-fencing, business hours), tiered pricing, temporary access windows.

**Prefer intersection (`&`) over standalone WASM:** Keep the relationship check as the first gate. WASM runs only if the relationship matches, which is cheaper and more auditable.

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

Ensure the same user cannot hold conflicting roles — e.g., a user who can approve payments must not also be able to initiate them.

```
type payment {
    relation initiator
    relation approver
    relation can_approve = approver - initiator
}
```

**When to use:** Financial controls, compliance workflows, four-eyes principle.

## Temporal Access (WASM)

Grant access only during specific time windows:

```
type shift_resource {
    relation assigned
    relation can_access = assigned & module("check_shift_hours")
}
```

The WASM module checks the current time against the user's shift schedule (passed via context).

**When to use:** Healthcare shift access, time-limited API keys, scheduled maintenance windows.

## Anti-Patterns

### Don't: Model permissions as direct relations

```
// ✗ Avoid — hard to audit, no composability
type document {
    relation can_view    // stored directly as tuples
    relation can_edit    // stored directly as tuples
}
```

Model **who has access** (viewer, editor, owner) and **compute what they can do** (can_view, can_edit). This makes the schema auditable and refactorable.

### Don't: Use exclusion where forbid is clearer

```
// ✗ Confusing — exclusion depends on evaluation order
relation can_view = viewer - suspended

// ✓ Clear — forbid always wins
forbid suspended
relation can_view = viewer
```

`forbid` rules are explicit deny, evaluated before all permits. They're easier to reason about and appear in `explain-permission` output.

### Don't: Deep WASM chains

```
// ✗ Every check runs 3 WASM modules — slow, hard to debug
relation can_view = viewer & module("a") & module("b") & module("c")
```

Consolidate context checks into a single WASM module. Each module invocation has sandbox startup overhead (~1-2ms).

## What's Next?

- [Modeling Guide](/docs/modeling) — Build a complete schema step by step
- [Schema Reference](/docs/ipl-reference) — Full syntax and evaluation semantics
- [WASM Modules](/docs/wasm) — Write custom authorization logic
