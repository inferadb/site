---
layout: docs
title: IPL Reference
doc_title: Schema Reference
doc_subtitle: Complete syntax reference for the Infera Policy Language.
---

## Keywords

| Keyword    | Usage                                                            |
| ---------- | ---------------------------------------------------------------- |
| `type`     | Declare an entity type                                           |
| `relation` | Declare a relation (direct or computed)                          |
| `forbid`   | Declare an explicit deny rule                                    |
| `this`     | Reference direct tuples for this relation                        |
| `from`     | Computed userset — follow relationship, check relation on target |
| `module`   | Invoke a WASM module                                             |

## Grammar

IPL uses a [PEG grammar](https://en.wikipedia.org/wiki/Parsing_expression_grammar). Formal definition: `engine/crates/core/src/ipl.pest`.

## Identifiers

Start with a letter (`a-z`, `A-Z`), followed by letters, digits, or underscores. Case-sensitive.

## Type Definitions

```rust
type <identifier> {
    (relation <identifier> [= <expression>])*
    (forbid <identifier> [= <expression>])*
}
```

## Expression Syntax

Ordered by precedence (lowest to highest):

| Expression         | Syntax                           | Description                                      |
| ------------------ | -------------------------------- | ------------------------------------------------ |
| Union              | `a \| b`                         | OR — any branch grants access                    |
| Intersection       | `a & b`                          | AND — all branches required                      |
| Exclusion          | `a - b`                          | Set difference — a minus b                       |
| Parenthesized      | `(expr)`                         | Grouping                                         |
| Direct reference   | `this`                           | Explicit tuples for this relation                |
| Relation reference | `<name>`                         | Another relation on the same type                |
| Computed userset   | `<relation> from <relationship>` | Follow relationship, check relation on target    |
| Related object     | `<relationship>-><computed>`     | Follow relationship, evaluate computed on target |
| WASM module        | `module("<name>")`               | Invoke sandboxed module                          |

## AST Nodes

Parser output types:

- `Schema { types: Vec<TypeDef> }`
- `TypeDef { name, relations: Vec<RelationDef>, forbids: Vec<ForbidDef> }`
- `RelationDef { name, expr: Option<RelationExpr> }` — `None` means direct-only
- `RelationExpr::Union(Vec<RelationExpr>)`
- `RelationExpr::Intersection(Vec<RelationExpr>)`
- `RelationExpr::Exclusion { base, subtract }`
- `RelationExpr::This`
- `RelationExpr::RelationRef { relation }`
- `RelationExpr::ComputedUserset { relation, relationship }`
- `RelationExpr::RelatedObjectUserset { relationship, computed }`
- `RelationExpr::WasmModule { module_name }`

## Evaluation Semantics

### Order of Evaluation

1. **Forbid rules** evaluate first. Any match returns `DENY` immediately.
2. **Permit rules** evaluate with short-circuit: union stops at first `Allow`, intersection stops at first `Deny`.
3. Union and intersection branches evaluate concurrently across threads.

### Query Cost Estimation

| Expression             | Cost |
| ---------------------- | ---- |
| Direct lookup (`this`) | 1    |
| Relation reference     | 5    |
| WASM module            | 8    |
| Tuple-to-userset       | 10   |

### Cycle Detection

Circular relation references are rejected during validation. Runtime cycles terminate with an error.

## Complete Example

```rust
type user {}

type team {
    relation member
    relation admin
}

type organization {
    relation admin
    relation member
    relation can_manage = admin
}

type folder {
    relation parent
    relation viewer
    relation editor
    relation can_view = viewer | editor | viewer from parent
    relation can_edit = editor
}

type document {
    relation parent
    relation viewer
    relation editor
    relation owner
    forbid suspended
    relation can_view = viewer | editor | owner | viewer from parent
    relation can_edit = editor | owner
    relation can_delete = owner
    relation can_share = owner & module("check_sharing_policy")
}
```
