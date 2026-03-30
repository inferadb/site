---
layout: post
title: "Why We Chose Rust for InferaDB"
post_title: "Why We Chose Rust for InferaDB"
date: 2026-02-08
category: engineering
description: "Rust's memory safety without GC pauses, fearless concurrency, and zero-cost abstractions make sub-microsecond authorization possible. Here's why we chose it."
hero: /assets/images/dispatch/why-rust.svg
authors:
  - Evan Sims
---

*When you use InferaDB Cloud, you don't think about what language it's written in. But the language choice is the reason your authorization checks resolve in microseconds, not milliseconds. Here's why we chose Rust.*

**The difference between 2.8 microseconds and 5 milliseconds isn't optimization. It's architecture.** And that architectural gap is why InferaDB is written in Rust — not because we prefer the language, but because our requirements eliminated every alternative.

An authorization database has a brutal performance contract. Sub-microsecond read latency at the storage engine level. Hundreds of thousands of concurrent operations. And critically, **no latency spikes**. Not "low latency most of the time." No spikes, period.

That last requirement is what narrows the field.

## The Garbage Collection Problem

Go, Java, and C# all have mature ecosystems for distributed systems. We evaluated each seriously. But their garbage collectors impose pause times measured in milliseconds — and for InferaDB, **the entire read path must complete in under 3 microseconds at p99**.

A single GC pause wipes out that budget. Not occasionally. Predictably, under load, exactly when consistent latency matters most.

This isn't a knock on those languages. They're excellent for the vast majority of systems work. But when your latency ceiling is measured in microseconds and your tail latency tolerance is zero, garbage collection is a dealbreaker.

C and C++ offer the raw performance. But manual memory management introduces buffer overflows, use-after-free bugs, and dangling pointers — the exact class of vulnerabilities an authorization system cannot afford. One memory corruption bug in the permission check path isn't a crash. It's a security incident.

**Rust's ownership model gives us memory safety without runtime overhead.** That specific combination is what our requirements demanded.

## Fearless Concurrency for Graph Traversal

Authorization evaluation is fundamentally a graph problem. You're traversing chains of group memberships, role assignments, and resource hierarchies to determine whether a path exists from a subject to a resource.

These traversals have natural parallelism. When checking if a user can access a document, you might need to explore their direct permissions, their team memberships, and inherited roles simultaneously. **Union and intersection branches can run in parallel** — if your language lets you do it safely.

In languages with garbage collectors or runtime-managed memory, concurrent data access requires careful synchronization. Locks are expensive and hard to get right. Lock-free structures are harder.

Rust's type system enforces **data race freedom at compile time**. If the code compiles, concurrent access to shared data structures is safe. Full stop. This guarantee let us implement parallel graph traversal in the authorization evaluator without the defensive locking strategies that dominate concurrent code elsewhere.

The result: traversals that would serialize in other languages run across multiple cores in InferaDB, shaving microseconds off every authorization check.

## Zero-Cost Abstractions on the Hot Path

The B+ tree storage engine operates on fixed-size pages, performs byte-level key comparisons, and manages memory layouts that must be precisely controlled for CPU cache efficiency. This is code where **nanoseconds compound**.

In a higher-level language, these operations involve boxing, dynamic dispatch, or runtime type checks. Each adds nanoseconds per operation — and those nanoseconds accumulate across thousands of operations in a single authorization evaluation.

Rust's generics are monomorphized at compile time. Trait methods are statically dispatched when the concrete type is known. The compiler aggressively inlines small functions. The abstraction boundaries that make the code maintainable — separating the page cache from tree traversal from key encoding — **have zero runtime cost**.

The compiled binary performs as if every layer were hand-written as a single monolithic function. We get clean architecture in the source and bare-metal performance in the binary.

## The Async Ecosystem

The I/O-intensive portions of InferaDB — Raft consensus, client request handling, inter-node communication — run on the **Tokio** async runtime with work-stealing scheduling. The ecosystem built around it is what makes Rust viable for a full distributed system, not just a storage engine:

- **Axum** serves the HTTP API
- **Tonic** handles gRPC for internal cluster communication
- **OpenRaft** provides a correct, well-tested Raft consensus implementation we adapted for our state machine and log storage
- **Moka** delivers a concurrent, bounded cache with TTL-based eviction for the authorization evaluation cache layer
- **Wasmtime** (itself written in Rust) sandboxes custom WASM policy modules, with the Cranelift JIT compiler generating native code from WASM bytecode

Each dependency was chosen because it's production-hardened. And Rust's package ecosystem makes composition safe: **type mismatches, lifetime violations, and thread safety issues are caught at compile time** rather than in production at 3 AM.

## The WASM Policy Sandbox

Custom authorization policies run in a WebAssembly sandbox powered by Wasmtime. This is where Rust's ecosystem advantage becomes especially clear.

Wasmtime is a Rust project. Cranelift is a Rust project. The integration between InferaDB's core and the policy sandbox is native, type-safe, and fast. There's no FFI boundary, no serialization layer, no impedance mismatch. **Policy evaluation runs at near-native speed** inside a memory-safe sandbox.

Try getting that combination in any other language ecosystem.

## The Trade-Off We Accepted

The honest answer: **Rust has a smaller hiring pool than Go or Java.** The learning curve for developers new to ownership semantics is steep. Compile times are longer. The borrow checker occasionally fights you on patterns that are obviously safe to a human.

We accepted this trade-off because the performance characteristics of InferaDB are not incremental improvements achievable by optimizing code in a higher-level language.

The difference between 2.8µs and 5ms comes from:

- **Eliminating GC pauses** entirely
- **Lock-free concurrent reads** via compile-time safety guarantees
- **Zero-cost abstractions** over the storage engine hot path
- **Compile-time enforcement** of thread safety and memory safety

These are properties of the language and runtime, not the application code. Choosing a different language would have meant accepting fundamentally different performance characteristics — which would have meant building a fundamentally different product.

## The Rust Bet Is Paying Off

Two years in, the bet has validated. Our p99 read latency is 2.8µs. We've had **zero memory safety CVEs**. The parallel graph traversal runs exactly as fast as the type system promised it would.

The hiring pool concern turned out to be a filter, not a bottleneck. Engineers who choose Rust tend to care deeply about correctness and performance — exactly the profile you want building authorization infrastructure.

If you're building systems where latency is measured in microseconds and correctness is non-negotiable, Rust isn't just a good choice. It might be the only one.

**[Explore InferaDB on GitHub](https://github.com/inferadb)** or **[read the quickstart guide](/docs/quickstart)** to see what 2.8µs authorization looks like in practice.
