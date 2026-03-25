---
layout: docs
title: IPL Overview — InferaDB
doc_title: Infera Policy Language
doc_subtitle: A declarative language for modeling entities, relationships, and permissions.
related:
  - /docs/ipl-reference
  - /docs/patterns
  - /docs/wasm
---

**IPL** defines your authorization model: entity types, their relationships, and derived permissions.

## Basic Structure

```rust
type user {}

type team {
    relation member
}

type organization {
    relation admin
    relation member
}

type document {
    relation parent
    relation viewer
    relation editor
    relation owner
    relation can_view = viewer | editor | owner
    relation can_edit = editor | owner
    relation can_delete = owner
}
```

## Types

Types represent entities in your system. Names must be alphanumeric (plus underscores), starting with a letter.

## Relations

**Direct relations** are stored as tuples. **Computed relations** derive access from expressions:

```rust
relation editor                            // direct
relation can_view = viewer | editor | owner  // computed
```

## Expressions

| Operator | Name | Grants access when... |
|----------|------|----------------------|
| `\|` | Union | **any** branch matches |
| `&` | Intersection | **all** branches match |
| `-` | Exclusion | base matches **and** exclusion does not |

```rust
relation can_view = viewer | editor | owner
relation can_view_sensitive = viewer & has_clearance
relation can_view_safe = viewer - blocked
```

### Tuple-to-Userset (`from`)

Follow a relation to a related object, then check a relation there:

```rust
type document {
    relation parent              // points to a folder
    relation inherited = viewer from parent  // inherit viewer from parent folder
}
```

If `document:readme` → `parent` → `folder:specs`, and `user:alice` is a `viewer` of `folder:specs`, then Alice has `inherited` on `document:readme`.

{% include diagram-inheritance.html %}

### Related Object Userset (`->`)

```rust
relation computed = parent->can_edit  // follow parent, evaluate can_edit there
```

### WASM Module

Invoke a sandboxed [WebAssembly module](/docs/wasm) for custom logic:

```rust
relation access = viewer & module("business_hours")
```

### Grouping

Use parentheses for precedence:

```rust
relation can_view = (viewer | editor) & module("check_ip")
```

## Forbid Rules

Forbid rules are **explicit deny** — evaluated before all permits and override them unconditionally:

```rust
type document {
    relation viewer
    forbid suspended          // denies access even if viewer matches
    relation can_view = viewer
}
```

## Wildcards

Grant access to all entities of a type with `type:*`:

```bash
inferadb relationships add "user:*" viewer document:public-faq
```

## Validation

Three validation passes run before deployment:

1. **Type checking** — references resolve, no undefined relations, cycle detection
2. **Conflict detection** — no permit-forbid conflicts on the same relation
3. **Coverage analysis** — unused relations and uncovered permissions

```bash
inferadb schemas validate schema.ipl
inferadb schemas push schema.ipl
```

## Comments

Single-line comments with `//`:

```rust
type document {
    relation viewer    // anyone with explicit view access
    relation editor    // can also view (via can_view)
    relation can_view = viewer | editor
}
```
