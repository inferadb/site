---
layout: docs
title: Modeling Guide — InferaDB
doc_title: Modeling Guide
doc_subtitle: Design a complete authorization schema for a real application, step by step.
---

This guide walks through designing an authorization model for **Workspace** — a collaborative document platform where users belong to teams, teams belong to organizations, and documents live in folders with inherited permissions.

By the end, you'll have a production-quality schema that combines ReBAC, RBAC, and ABAC in a single IPL file.

## The Application

Workspace has these requirements:

1. **Users** belong to **teams** and **organizations**
2. **Documents** live in **folders** with cascading permissions
3. Org **admins** can access everything
4. **Editors** can view and edit; **viewers** can only view
5. Explicit **deny** overrides any grant (e.g., suspended users)
6. Access can require **business hours** or specific **IP ranges**

## Phase 1: Identify Your Entities

List the nouns (types) and verbs (relations) in your application.

| Entity       | Relations                                  |
| ------------ | ------------------------------------------ |
| user         | (no relations — subjects, not resources)   |
| organization | admin, member                              |
| team         | org (parent), member                       |
| folder       | org (parent), viewer, editor               |
| document     | folder (parent), viewer, editor, owner     |

Start with empty type stubs:

```
type user {}

type organization {}

type team {}

type folder {}

type document {}
```

## Phase 2: Add Direct Relations

Direct relations are stored facts — the edges in your authorization graph.

```
type user {}

type organization {
    relation admin
    relation member
}

type team {
    relation org         // which organization this team belongs to
    relation member
}

type folder {
    relation org         // which organization owns this folder
    relation viewer
    relation editor
}

type document {
    relation folder      // which folder contains this document
    relation viewer
    relation editor
    relation owner
}
```

Write some test data:

```bash
inferadb relationships add user:alice admin organization:acme
inferadb relationships add user:bob member team:engineering
inferadb relationships add team:engineering org organization:acme
inferadb relationships add user:charlie editor document:roadmap
```

At this point, each relation is independent — no inheritance or computed permissions. Alice is an org admin, but that doesn't give her document access yet.

## Phase 3: Compute Permissions

Derive permissions from relationships using IPL expressions.

**Document access:**

```
type document {
    relation folder
    relation viewer
    relation editor
    relation owner

    // Computed permissions
    relation can_view = viewer | editor | owner
    relation can_edit = editor | owner
    relation can_delete = owner
}
```

`|` (union) means "any branch grants access."

```bash
inferadb check document:roadmap can_view user:charlie
# ✓ ALLOWED — charlie is an editor, editors can view

inferadb check document:roadmap can_delete user:charlie
# ✗ DENIED — charlie is an editor, not an owner
```

## Phase 4: Inherit Permissions Through Hierarchies

Folder editors should edit documents in that folder. This is **tuple-to-userset** — follow a relation to a parent, then check a permission there.

```
type document {
    relation folder
    relation viewer
    relation editor
    relation owner
    relation can_view = viewer | editor | owner | viewer from folder | editor from folder
    relation can_edit = editor | owner | editor from folder
    relation can_delete = owner
}
```

`viewer from folder` means: follow the `folder` relation to the parent, then check `viewer` there.

```bash
inferadb relationships add user:dana viewer folder:engineering
inferadb relationships add document:roadmap folder folder:engineering

inferadb check document:roadmap can_view user:dana
# ✓ ALLOWED — dana is a viewer of folder:engineering, roadmap is in that folder
```

Apply the same pattern to folders inheriting from organizations:

```
type folder {
    relation org
    relation viewer
    relation editor
    relation can_view = viewer | editor | member from org
    relation can_edit = editor | admin from org
}
```

Org members can now view all folders in their org. Org admins can edit them.

## Phase 5: Add Deny Rules

Suspended users must be denied access regardless of other permissions.

```
type document {
    relation folder
    relation viewer
    relation editor
    relation owner
    forbid suspended
    relation can_view = viewer | editor | owner | viewer from folder | editor from folder
    relation can_edit = editor | owner | editor from folder
    relation can_delete = owner
}
```

```bash
inferadb relationships add user:charlie suspended document:roadmap

inferadb check document:roadmap can_edit user:charlie
# ✗ DENIED — forbid rules override all permits
```

## Phase 6: Add Contextual Checks with WASM

Business-hours restrictions are ABAC — decisions depend on context, not just relationships. Use a WASM module:

```
type document {
    relation folder
    relation viewer
    relation editor
    relation owner
    forbid suspended
    relation can_view = viewer | editor | owner | viewer from folder | editor from folder
    relation can_edit = (editor | owner | editor from folder) & module("business_hours")
    relation can_delete = owner
}
```

`&` (intersection) with `module("business_hours")` requires editor access AND WASM module approval. See [WASM Modules](/docs/wasm) for module implementation.

## The Complete Schema

```
type user {}

type organization {
    relation admin
    relation member
}

type team {
    relation org
    relation member
}

type folder {
    relation org
    relation viewer
    relation editor
    relation can_view = viewer | editor | member from org
    relation can_edit = editor | admin from org
}

type document {
    relation folder
    relation viewer
    relation editor
    relation owner
    forbid suspended
    relation can_view = viewer | editor | owner | viewer from folder | editor from folder
    relation can_edit = (editor | owner | editor from folder) & module("business_hours")
    relation can_delete = owner
}
```

Validate and push:

```bash
inferadb schemas validate schema.ipl
inferadb schemas push schema.ipl
```

## Schema Design Checklist

- [ ] Every noun in your domain has a type
- [ ] Relations are direct (stored) or computed (derived) — never both
- [ ] Hierarchy inheritance uses `from` (tuple-to-userset) or `->` (related object userset)
- [ ] Deny rules use `forbid` — not exclusion (`-`) on computed permissions
- [ ] WASM modules are used for context-dependent checks (time, IP, attributes), not for relationship logic
- [ ] Schema passes `inferadb schemas validate` with no warnings
- [ ] You've tested both allowed and denied cases for every computed permission

## Common Patterns

### Team-Based Access

```
type team {
    relation org
    relation member
}

type resource {
    relation team
    relation can_access = member from team
}
```

### Multi-Level Inheritance (Org → Folder → Document)

```
relation can_view = viewer | viewer from folder | member from folder->org
```

### Conditional Access (Intersection)

```
relation can_view_sensitive = viewer & has_clearance & module("check_ip")
```

### Public Resources (Wildcard)

```bash
inferadb relationships add "user:*" viewer document:public-faq
```

