---
layout: post
title: "The Infera Policy Language: One Schema for Every Authorization Model — InferaDB"
post_title: "The Infera Policy Language: One Schema for Every Authorization Model"
date: 2026-02-25
category: engineering
description: "IPL unifies ReBAC, RBAC, and ABAC in a single schema language with PEG grammar, static analysis, and parallel evaluation — no more choosing between authorization paradigms."
authors:
  - Evan Sims
---

Why should you have to choose between relationship-based, role-based, and attribute-based access control? Zanzibar-style systems excel at organizational hierarchies but struggle with attribute conditions. Policy engines like OPA handle arbitrary logic but require imperative code for every decision. Role-based systems are simple until role explosion makes them unmanageable.

**The Infera Policy Language unifies all three paradigms into a single schema language.** One syntax for relationships, roles, attributes, and custom logic — analyzed statically, evaluated in parallel, and auditable by default.

## The Grammar: Unambiguous by Construction

IPL is defined by a **PEG (Parsing Expression Grammar)**, which gives it unambiguous parsing semantics. There is exactly one way to parse any valid IPL document, eliminating the subtle bugs that arise from ambiguous grammars in other policy languages.

The core keywords are deliberately few:

| Keyword | Purpose |
|---|---|
| `type` | Define an entity type |
| `relation` | Define a relationship or permission |
| `forbid` | Declare an explicit deny rule |
| `this` | Reference the current type |
| `from` | Express computed usersets |
| `module` | Invoke a WASM policy module |

## Expression Operators: Composable Access Control

IPL's power comes from six operators that compose these primitives into expressive access control rules:

- **Union** (`\|`) — access from any source: `owner \| editor \| viewer`
- **Intersection** (`&`) — all conditions must hold: `editor & module("business_hours")`
- **Exclusion** (`-`) — remove specific grants: `viewer - suspended`
- **Computed userset** (`from`) — follow relationship chains: `editor from parent`
- **Related object** (`->`) — traverse typed relationships: `org->admin`
- **Module** (`module()`) — invoke WASM for custom logic: `module("risk_score")`

These operators compose freely. You can express "users who are editors of the parent folder, during business hours, excluding suspended accounts" as a single IPL expression. No imperative code. No escape hatches.

## Forbid Rules: Deny Always Wins

IPL follows a strict evaluation precedence: **forbid rules are always evaluated before permit rules**. If any forbid rule matches, access is denied regardless of what permit rules might also match.

This is a deliberate design choice that makes security boundaries unambiguous. Consider a common enterprise pattern: "all editors can modify documents, except documents in the legal hold collection." In IPL:

```
type document {
    relation editor: user
    relation legal_hold: legal_hold_collection

    forbid edit = legal_hold
    relation can_edit = editor
}
```

The forbid rule takes precedence over the editor permission, **regardless of how the editor relationship was derived**. Developers do not need to reason about rule ordering or worry that a broadly-scoped permit will override a narrowly-scoped restriction. Deny always wins.

## Three Validation Passes: Catch Bugs at Deploy Time

IPL documents pass through **three validation phases** before the system accepts them. Most authorization bugs are caught here — not at runtime.

**Pass 1: Type checking.** Verifies that all referenced types and relations exist, that relationship expressions connect compatible types, and that module references point to uploaded WASM modules. A typo in a relation name is caught immediately, not when a user is denied access in production.

**Pass 2: Conflict detection.** Identifies rules that can never match (dead code), rules that always overlap (redundant grants), and forbid rules that shadow permit rules in ways that might not be intentional. This is the pass that catches "you wrote a forbid rule that makes this entire permission unreachable" before it ships.

**Pass 3: Coverage analysis.** Reports which type-action pairs have no rules defined, helping developers **identify gaps in their authorization schema** before they become security vulnerabilities. If you add a new action to a type but forget to define who can perform it, coverage analysis flags it.

Three passes. Zero runtime surprises.

## Query Evaluation: Cost-Based and Parallel

The query engine evaluates IPL expressions as a **directed acyclic graph (DAG)**, with each node representing a sub-expression and edges representing data dependencies. Independent branches — the two sides of a union expression, for example — are evaluated in parallel.

Before execution, the engine performs **query cost estimation** using statistics about the cardinality of relationship sets. It chooses between two strategies:

- **Materialization:** Pre-compute all members of a set (efficient for small, frequently accessed sets)
- **Iteration:** Check membership on demand (efficient for large sets where only one member matters)

For large relationship graphs, this cost-based optimization can mean the difference between a **microsecond response and a millisecond response**.

Cycle detection runs at schema validation time, rejecting any type definition that would create an infinite traversal loop. The combination of static analysis at deploy time and cost-based optimization at query time means IPL schemas are **safe and performant by construction**.

## What This Means in Practice

IPL eliminates the authorization paradigm tax. You do not need separate systems for "who is related to what" (ReBAC), "what role does this user have" (RBAC), and "does this request meet these conditions" (ABAC). You write one schema. It is checked at deploy time. It evaluates in parallel at query time. And it produces a complete audit trail for every decision.

No more choosing between paradigms. No more stitching together three systems with application code. **One language, one evaluation, one audit trail.**

---

Ready to write your first authorization schema? **[Start with the IPL documentation](/docs/)** or **[try the quickstart guide](/docs/quickstart)**.
