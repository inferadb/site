---
layout: post
title: "WebAssembly Policy Modules"
post_title: "WebAssembly Policy Modules: Custom Authorization Logic in Any Language"
date: 2026-03-01
last_modified_at: 2026-03-01
category: engineering
description: "Write custom authorization logic in Rust, TypeScript, or any WASM-compatible language — sandboxed with strict resource limits."
hero: /assets/images/dispatch/wasm-modules.svg
authors:
  - Evan Sims
---

What happens when your authorization logic does not fit into a declarative model? Time-based access windows. Geofencing. Risk score thresholds. Business-hours restrictions. Escalation policies that depend on external state. These are the cases where teams either **contort their schema into an unreadable mess** or move the logic into application code — where it becomes invisible to the authorization layer and impossible to audit.

InferaDB gives you a third option: **write it in any language, deploy it as a WebAssembly module, and run it inside the authorization engine itself.**

## How It Works

Developers write custom authorization logic in any language that compiles to WASM — **Rust, TypeScript, AssemblyScript, C, Go**, or any of the dozens of languages with WASM targets. The compiled module is deployed to InferaDB and invoked during policy evaluation via the `module()` expression in the Infera Policy Language.

A policy might declare that access to a resource requires both a `viewer` relationship AND a passing result from a `business_hours` WASM module. The declarative relationship check and the imperative WASM evaluation are **composed in the same policy**, evaluated in the same request, and recorded in the same audit trail.

No sidecar. No external policy engine. No network hop.

## The Sandbox: Strict by Design

The execution environment is built on **Wasmtime with the Cranelift JIT compiler**, chosen for its mature security model and predictable performance. Every module execution is sandboxed with hard resource limits:

| Resource | Default | Maximum |
|---|---|---|
| Execution timeout | 100ms | 5s |
| Memory | 10MB | 256MB |
| Instruction fuel | 1M operations | — |

Critically, WASM modules have **no access to I/O, the network, or the filesystem**. They cannot make HTTP requests, read environment variables, or access any state beyond what the host explicitly provides. Each invocation runs in an isolated Wasmtime store that is created for the request and destroyed after execution — **no state leaks between evaluations**.

The instruction fuel limit prevents infinite loops and algorithmic complexity attacks. If a module exceeds its fuel budget, execution halts immediately with a deny result.

## A Minimal, Auditable Interface

The module contract is deliberately simple:

**Module exports:**
- `check() -> i32` — returns `0` for deny, `1` for allow

**Host provides:**
- `log(ptr, len)` — emit structured log entries captured in the evaluation trace

Input data — the subject, resource, action, and contextual attributes — is passed via a shared memory region that the host populates before invocation. That is the entire interface.

This minimalism is intentional. A business-hours check might be **thirty lines of Rust** that reads a timezone attribute, computes the current local time, and returns `1` if the time falls within the configured window. Simple to write, simple to test, simple to audit.

## Layered Security Model

Security is enforced at every level of the stack:

**Language level.** WASM's linear memory model prevents buffer overflows and pointer arithmetic exploits. There is no `unsafe` memory access — the runtime enforces bounds checking on every memory operation.

**Runtime level.** Wasmtime's sandbox enforces resource limits and prevents unauthorized host access. A module cannot call any function the host has not explicitly exported.

**System level.** InferaDB validates modules at upload time, rejecting any module that imports unauthorized host functions or exceeds size limits. Malformed modules never reach the execution path.

**Determinism guarantee.** Given the same inputs, a module must produce the same output. This means modules can be safely **cached, replayed during audit, and evaluated on any node** in the cluster with identical results. In a distributed authorization system where the same evaluation might execute on different nodes, determinism is not optional — it is a correctness requirement.

## Composing WASM with Declarative Policy

Integration with IPL is seamless. The `module("name")` expression can appear **anywhere a boolean condition is expected** in a policy rule. It composes with all IPL operators:

```
// Users with editor role who pass risk scoring,
// excluding sanctioned users
relation can_edit = editor & module("risk_score") - module("sanctions_check")
```

The evaluation engine handles module invocations as **leaf nodes in the policy evaluation tree**, executing them in parallel with other branches where data dependencies allow. Adding a WASM module to a policy does not serialize the entire evaluation — relationship traversals and other declarative checks proceed concurrently while the module runs in its sandbox.

This means you get the **expressiveness of imperative code** with the **composability of declarative policy** — without sacrificing performance or auditability.

## When to Use WASM Modules

WASM modules are the right tool when your authorization logic depends on **runtime context that cannot be modeled as a relationship or attribute**:

- **Time-based access:** Business hours, maintenance windows, time-limited grants
- **Risk scoring:** Dynamic risk assessment based on request context
- **Compliance checks:** Sanctions screening, geographic restrictions, regulatory holds
- **Custom business logic:** Organization-specific rules that do not generalize

For everything else — role hierarchies, relationship traversals, attribute conditions — the declarative IPL is faster, simpler, and easier to analyze statically. Use WASM for the 5% of logic that truly needs imperative code.

---

Want to write your first policy module? **[Follow the WASM quickstart guide](/docs/quickstart)** to deploy a module in under five minutes.
