---
layout: docs
title: Rust SDK — InferaDB
doc_title: Rust SDK
doc_subtitle: Type-safe, async-first client library for InferaDB.
---

Idiomatic bindings for all InferaDB APIs. Published on [crates.io](https://crates.io/crates/inferadb). MSRV: 1.88.0.

## Installation

```ini
[dependencies]
inferadb = "0.1"
```

## Authentication

Three authentication methods:

| Method                           | Use Case                     | Security |
| -------------------------------- | ---------------------------- | -------- |
| Client Credentials (Ed25519 JWT) | Service-to-service           | High     |
| Bearer Token                     | User sessions, OAuth         | Medium   |
| API Key                          | Testing, simple integrations | Basic    |

### Client Credentials (Recommended)

```rust
use inferadb::{Client, Ed25519PrivateKey, ClientCredentialsConfig};

let client = Client::builder()
    .url("https://engine.inferadb.com")
    .credentials(ClientCredentialsConfig {
        client_id: "my-client".into(),
        private_key: Ed25519PrivateKey::from_pem_file("client.pem")?,
        certificate_id: "cert-id".into(),
    })
    .build()
    .await?;
```

## Permission Checks

```rust
let vault = client.organization("my-org").vault("production");

let allowed = vault.check("user:alice", "can_edit", "document:readme").await?;

// With ABAC context
let allowed = vault
    .check("user:alice", "can_view", "document:readme")
    .with_context(Context::new().set("ip_address", "10.0.0.1"))
    .await?;

// Require (returns Err on deny)
vault.check("user:alice", "can_edit", "document:readme")
    .require()
    .await?;

// With consistency token
vault.check("user:alice", "can_view", "document:readme")
    .at_least_as_fresh(revision_token)
    .await?;

// Batch check
let results = vault.check_batch([
    ("user:alice", "can_edit", "document:readme"),
    ("user:bob", "can_view", "document:readme"),
]).await?;
assert!(results.all_allowed());
```

## Relationships

```rust
// Write
let token = vault.relationships()
    .write(Relationship::new("document:readme", "editor", "user:alice"))
    .await?;

// Batch write
vault.relationships()
    .write_batch([
        Relationship::new("document:readme", "editor", "user:alice"),
        Relationship::new("document:readme", "viewer", "user:bob"),
    ])
    .await?;

// List
let rels = vault.relationships()
    .list()
    .resource("document:readme")
    .collect()
    .await?;

// Delete
vault.relationships()
    .delete_where()
    .resource("document:readme")
    .relation("viewer")
    .subject("user:bob")
    .execute()
    .await?;
```

## Lookups

```rust
// What resources can Alice view?
let resources = vault.resources()
    .accessible_by("user:alice")
    .with_permission("can_view")
    .resource_type("document")
    .collect()
    .await?;

// Who can edit this document?
let subjects = vault.subjects()
    .with_permission("can_edit")
    .on_resource("document:readme")
    .collect()
    .await?;
```

## Testing

### MockClient (Fastest)

```rust
let client = MockClient::builder()
    .check("user:alice", "can_edit", "document:readme", true)
    .check("user:bob", "can_edit", "document:readme", false)
    .check_any_subject("can_view", "document:readme", true)
    .default_deny()
    .verify_on_drop(true)
    .build();
```

### InMemoryClient (Full Policy Evaluation)

```rust
let client = InMemoryClient::with_schema_and_data(
    r#"
    type document {
        relation viewer
        relation editor
        relation can_view = viewer | editor
    }
    "#,
    vec![
        ("document:readme", "editor", "user:alice"),
        ("document:readme", "viewer", "user:bob"),
    ],
);
```

### TestVault (Real Instance)

Auto-cleans up on drop.

```rust
let vault = TestVault::create_with_schema(&org, schema_ipl).await;
```

## Error Handling

```rust
match vault.check("user:alice", "can_edit", "document:readme").await {
    Ok(true) => { /* allowed */ },
    Ok(false) => { /* denied */ },
    Err(e) if e.is_retriable() => { /* retry */ },
    Err(e) => { /* handle error */ },
}
```

`ErrorKind` variants: `Unauthorized`, `Forbidden`, `NotFound`, `RateLimited`, `SchemaViolation`, `Unavailable`, `Timeout`, `InvalidArgument`.

## Feature Flags

| Flag       | Default | Description                      |
| ---------- | ------- | -------------------------------- |
| `grpc`     | Yes     | gRPC transport                   |
| `rest`     | Yes     | HTTP/REST transport              |
| `rustls`   | Yes     | TLS via rustls                   |
| `tracing`  | No      | OpenTelemetry integration        |
| `blocking` | No      | Synchronous API                  |
| `wasm`     | No      | Browser/WASM support (REST only) |
