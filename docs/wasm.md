---
layout: docs
title: WASM Modules — InferaDB
doc_title: WASM Policy Modules
doc_subtitle: Extend authorization logic with sandboxed WebAssembly.
---

For authorization logic that goes beyond declarative relations — IP ranges, subscription tiers, time windows, compliance rules — InferaDB supports WebAssembly modules that execute in a deterministic, sandboxed environment.

## How It Works

1. Write a module that exports a `check()` function returning `i32`
2. Load the module into InferaDB
3. Reference it in your IPL schema with `module("name")`
4. The module is invoked during permission evaluation

## Module Contract

Your WASM module must export a function named `check` that returns `i32`:

- Return `0` → **deny**
- Return non-zero → **allow**

### Example: Simple Allow

```wat
(module
  (func (export "check") (result i32)
    i32.const 1
  )
)
```

### Example: With Logging

```wat
(module
  (import "host" "log" (func $log (param i32 i32)))
  (memory (export "memory") 1)
  (data (i32.const 0) "checking access")

  (func (export "check") (result i32)
    i32.const 0    ;; pointer to string
    i32.const 15   ;; string length
    call $log
    i32.const 1    ;; allow
  )
)
```

## Using in IPL

```
type document {
    relation viewer
    relation access = viewer & module("business_hours")
}
```

The `module("business_hours")` expression is evaluated as part of the intersection — the user must be a `viewer` **and** the WASM module must return allow.

## Host Functions

| Function   | Signature              | Description                           |
| ---------- | ---------------------- | ------------------------------------- |
| `host.log` | `(ptr: i32, len: i32)` | Log a UTF-8 string from module memory |

## Execution Context

Each module invocation receives an `ExecutionContext`:

- `subject` — The subject being checked (e.g., `"user:alice"`)
- `resource` — The resource being accessed (e.g., `"document:readme"`)
- `permission` — The permission being evaluated (e.g., `"can_view"`)
- `context` — Optional JSON context data (IP address, time, custom attributes)

## Sandbox Limits

| Property            | Default   | Hard Maximum |
| ------------------- | --------- | ------------ |
| Execution time      | 100ms     | 5 seconds    |
| Memory              | 10 MB     | 256 MB       |
| Fuel (instructions) | 1,000,000 | —            |
| Table elements      | 1,000     | —            |
| Instances           | 1         | —            |
| WASI                | Disabled  | —            |

## Security Model

| Property          | Guarantee                                                       |
| ----------------- | --------------------------------------------------------------- |
| **No I/O**        | Filesystem, network, and system calls are completely disabled   |
| **Deterministic** | Fuel-based execution, no access to clocks or randomness         |
| **Memory-safe**   | ResourceLimiter enforces memory caps at runtime                 |
| **Isolated**      | Each invocation creates a fresh Store — no shared mutable state |
| **Auditable**     | Every invocation is traced via OpenTelemetry spans              |

## Languages

Write modules in any language that compiles to WebAssembly:

- **Rust** (recommended) — `wasm32-unknown-unknown` target
- **AssemblyScript** — TypeScript-like syntax
- **C/C++** — via Emscripten or wasi-sdk
- **WAT** — WebAssembly Text format (for simple modules)

## Limitations

- WASM modules can only be used in `check` operations — they cannot enumerate users (expand/list operations will return an error)
- The `check()` function signature is `() -> i32` with no parameters; context is accessed via host functions
- Module signing and versioning (described in the whitepaper) is planned but not yet implemented
