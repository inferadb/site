---
layout: docs
title: WASM Modules — InferaDB
doc_title: WASM Policy Modules
doc_subtitle: Extend authorization logic with sandboxed WebAssembly.
---

InferaDB supports sandboxed WebAssembly modules for context-dependent authorization: IP ranges, subscription tiers, time windows, compliance rules.

## How It Works

1. Export a `check()` function returning `i32`
2. Load the module into InferaDB
3. Reference it in IPL with `module("name")`

## Module Contract

Export a function named `check` returning `i32`:

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

The user must be a `viewer` **and** the WASM module must return allow.

## Host Functions

| Function   | Signature              | Description                           |
| ---------- | ---------------------- | ------------------------------------- |
| `host.log` | `(ptr: i32, len: i32)` | Log a UTF-8 string from module memory |

## Execution Context

Each invocation receives an `ExecutionContext`:

| Field        | Example              | Description                    |
| ------------ | -------------------- | ------------------------------ |
| `subject`    | `"user:alice"`       | Subject being checked          |
| `resource`   | `"document:readme"`  | Resource being accessed        |
| `permission` | `"can_view"`         | Permission being evaluated     |
| `context`    | `{...}`              | Optional JSON (IP, time, etc.) |

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

Any language that compiles to WebAssembly works: **Rust** (recommended, `wasm32-unknown-unknown`), **AssemblyScript**, **C/C++** (Emscripten/wasi-sdk), or **WAT**.

## Limitations

- Only usable in `check` operations — expand/list operations return an error
- `check()` signature is `() -> i32`; access context via host functions
- Module signing and versioning is planned but not yet implemented
