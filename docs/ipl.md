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

The **Infera Policy Language (IPL)** defines your authorization model — what types of entities exist, how they relate to each other, and what permissions are derived from those relationships.

## Basic Structure

An IPL schema is a collection of type definitions:

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

Types represent the kinds of entities in your system. Every type has a unique name (alphanumeric + underscores, starting with a letter).

```rust
type document {
    // relations and permissions go here
}
```

## Relations

**Direct relations** store explicit tuples — when you write `(user:alice, editor, document:readme)`, that's a direct relation.

```rust
relation editor    // direct: stored as tuples
```

**Computed relations** derive access from expressions:

```rust
relation can_view = viewer | editor | owner
```

## Expressions

### Union (`|`)

Access is granted if **any** branch matches:

```rust
relation can_view = viewer | editor | owner
```

### Intersection (`&`)

Access is granted only if **all** branches match:

```rust
relation can_view_sensitive = viewer & has_clearance
```

### Exclusion (`-`)

Access is granted by the base set but removed by the exclusion:

```rust
relation can_view_safe = viewer - blocked
```

### Tuple-to-Userset (`from`)

Follow a relationship to a related object, then check a relation on that object:

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

Forbid rules are **explicit deny** directives. They are evaluated **before** all permit rules and override them unconditionally:

```rust
type document {
    relation viewer
    forbid suspended
    relation can_view = viewer
}
```

If `user:bob` has the `suspended` relation on `document:readme`, he is denied access even if he also has `viewer`.

## Wildcards

Use `type:*` to grant access to all entities of a type:

```bash
inferadb relationships add "user:*" viewer document:public-faq
```

This makes `document:public-faq` viewable by any user.

## Validation

IPL schemas are validated across three passes before deployment:

1. **Type checking** — All relation references resolve, no undefined relations, cycle detection
2. **Conflict detection** — No permit-forbid conflicts on the same relation name
3. **Coverage analysis** — Identifies unused relations and uncovered permissions

Push and validate in a single step:

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
