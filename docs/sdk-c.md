---
layout: docs
title: C/C++ SDK — InferaDB
doc_title: C/C++ SDK
doc_subtitle: Native C library with C++ wrapper for InferaDB.
---

> **Coming soon.** The C/C++ SDK is under active development. The API surface shown here is based on the [Rust SDK](/docs/sdk-rust) and may change before release.

The official C/C++ SDK (`libinferadb`) provides a native client for InferaDB's authorization APIs. The C library (`inferadb.h`) offers a stable ABI suitable for FFI from any language. The C++ wrapper (`inferadb.hpp`) provides RAII-based resource management and modern C++20 idioms.

Built on the Rust SDK via `cxx` for memory safety in the transport layer. Requires a C11-compatible compiler (C API) or C++20 (C++ wrapper).

## Installation

### vcpkg

```bash
vcpkg install inferadb
```

### CMake (FetchContent)

```cmake
include(FetchContent)
FetchContent_Declare(
  inferadb
  GIT_REPOSITORY https://github.com/inferadb/c.git
  GIT_TAG v0.1.0
)
FetchContent_MakeAvailable(inferadb)

target_link_libraries(my_app PRIVATE inferadb::inferadb)
```

### pkg-config (system install)

```bash
pkg-config --cflags --libs inferadb
```

## C API

### Client Initialization

```c
#include <inferadb.h>

inferadb_client_t *client = NULL;
inferadb_error_t *err = NULL;

inferadb_config_t config = {
    .url = "https://engine.inferadb.com",
    .auth = {
        .type = INFERADB_AUTH_CLIENT_CREDENTIALS,
        .client_credentials = {
            .client_id = "my-client",
            .private_key_path = "client.pem",
            .certificate_id = "cert-id",
        },
    },
};

if (inferadb_client_new(&config, &client, &err) != INFERADB_OK) {
    fprintf(stderr, "Failed to connect: %s\n", inferadb_error_message(err));
    inferadb_error_free(err);
    return 1;
}

/* ... use client ... */

inferadb_client_free(client);
```

### Permission Checks

```c
inferadb_vault_t *vault = inferadb_vault_open(client, "my-org", "production", &err);
if (!vault) {
    fprintf(stderr, "Failed to open vault: %s\n", inferadb_error_message(err));
    inferadb_error_free(err);
    inferadb_client_free(client);
    return 1;
}

bool allowed = false;
if (inferadb_check(vault, "user:alice", "can_edit", "document:readme",
                   NULL, &allowed, &err) != INFERADB_OK) {
    fprintf(stderr, "Check failed: %s\n", inferadb_error_message(err));
    inferadb_error_free(err);
}

if (allowed) {
    /* access granted */
}

inferadb_vault_free(vault);
```

### With ABAC Context

```c
inferadb_context_t *ctx = inferadb_context_new();
inferadb_context_set_string(ctx, "ip_address", "10.0.0.1");

bool allowed = false;
inferadb_check(vault, "user:alice", "can_view", "document:readme",
               ctx, &allowed, &err);

inferadb_context_free(ctx);
```

### Batch Check

```c
inferadb_check_request_t requests[] = {
    { .subject = "user:alice", .permission = "can_edit", .resource = "document:readme" },
    { .subject = "user:bob",   .permission = "can_view", .resource = "document:readme" },
};

inferadb_check_result_t *results = NULL;
size_t result_count = 0;

if (inferadb_check_batch(vault, requests, 2, &results, &result_count, &err) != INFERADB_OK) {
    fprintf(stderr, "Batch check failed: %s\n", inferadb_error_message(err));
    inferadb_error_free(err);
}

for (size_t i = 0; i < result_count; i++) {
    printf("Request %zu: %s\n", i, results[i].allowed ? "allowed" : "denied");
}

inferadb_check_results_free(results, result_count);
```

### Relationships

```c
/* Write */
inferadb_revision_t *token = NULL;
inferadb_write_relationship(vault,
    "document:readme", "editor", "user:alice",
    &token, &err);
inferadb_revision_free(token);

/* Delete */
inferadb_delete_relationship(vault,
    "document:readme", "viewer", "user:bob",
    &err);
```

### Error Handling

```c
/* assumes vault from the Permission Checks example above */
inferadb_error_t *err = NULL;
bool allowed = false;

if (inferadb_check(vault, "user:alice", "can_edit", "document:readme",
                   NULL, &allowed, &err) != INFERADB_OK) {
    inferadb_error_kind_t kind = inferadb_error_kind(err);
    const char *message = inferadb_error_message(err);
    const char *request_id = inferadb_error_request_id(err);

    if (inferadb_error_is_retriable(err)) {
        unsigned int retry_after_ms = inferadb_error_retry_after(err);
        /* retry after delay */
    }

    inferadb_error_free(err);
}
```

Error kinds: `INFERADB_ERR_UNAUTHORIZED`, `INFERADB_ERR_FORBIDDEN`, `INFERADB_ERR_NOT_FOUND`, `INFERADB_ERR_RATE_LIMITED`, `INFERADB_ERR_SCHEMA_VIOLATION`, `INFERADB_ERR_UNAVAILABLE`, `INFERADB_ERR_TIMEOUT`, `INFERADB_ERR_INVALID_ARGUMENT`.

### Cleanup

Every `inferadb_*_new` or `inferadb_*_open` has a corresponding `inferadb_*_free`. Every output parameter that allocates must be freed by the caller.

| Allocator                       | Deallocator                   |
| ------------------------------- | ----------------------------- |
| `inferadb_client_new`           | `inferadb_client_free`        |
| `inferadb_vault_open`           | `inferadb_vault_free`         |
| `inferadb_context_new`          | `inferadb_context_free`       |
| `inferadb_revision_*` (output)  | `inferadb_revision_free`      |
| `inferadb_check_batch` (output) | `inferadb_check_results_free` |
| `inferadb_error_*` (output)     | `inferadb_error_free`         |

## C++ API

The C++ wrapper provides RAII resource management, exceptions, and modern idioms:

### Client Initialization

```cpp
#include <inferadb/inferadb.hpp>

auto client = inferadb::Client::builder()
    .url("https://engine.inferadb.com")
    .credentials(inferadb::ClientCredentials{
        .client_id = "my-client",
        .private_key = inferadb::Ed25519PrivateKey::from_pem_file("client.pem"),
        .certificate_id = "cert-id",
    })
    .build();
```

### Permission Checks

```cpp
auto vault = client.organization("my-org").vault("production");

// Simple check
bool allowed = vault.check("user:alice", "can_edit", "document:readme");

// With ABAC context
auto opts = inferadb::CheckOptions{};
opts.context["ip_address"] = "10.0.0.1";
bool allowed = vault.check("user:alice", "can_view", "document:readme", opts);

// Require — throws inferadb::AccessDeniedError
vault.require("user:alice", "can_edit", "document:readme");

// Batch check
auto results = vault.check_batch({
    {"user:alice", "can_edit", "document:readme"},
    {"user:bob", "can_view", "document:readme"},
});
if (results.all_allowed()) {
    // all checks passed
}
```

### Relationships

```cpp
// Write — returns a revision token
auto token = vault.relationships().write({
    .resource = "document:readme",
    .relation = "editor",
    .subject = "user:alice",
});

// Batch write
vault.relationships().write_batch({
    {"document:readme", "editor", "user:alice"},
    {"document:readme", "viewer", "user:bob"},
});

// List
auto rels = vault.relationships().list({.resource = "document:readme"});

// Delete
vault.relationships().delete_where({
    .resource = "document:readme",
    .relation = "viewer",
    .subject = "user:bob",
});
```

### Error Handling

```cpp
#include <inferadb/inferadb.hpp>

try {
    vault.require("user:alice", "can_edit", "document:readme");
} catch (const inferadb::AccessDeniedError&) {
    // permission denied
} catch (const inferadb::Error& e) {
    if (e.is_retriable()) {
        std::this_thread::sleep_for(e.retry_after());
        // retry
    }
    std::cerr << "Error: kind=" << e.kind_name()
              << " request_id=" << e.request_id() << "\n";
}
```

### RAII Guarantees

All C++ types are RAII-compliant:

- `inferadb::Client` — moves only (no copy), closes connection on destruction
- `inferadb::Vault` — lightweight handle, safe to copy
- `inferadb::Revision` — copyable, movable, comparable

## Testing

### MockClient

```cpp
#include <inferadb/testing.hpp>

auto client = inferadb::testing::MockClient::builder()
    .on_check("user:alice", "can_edit", "document:readme").allow()
    .on_check("user:bob", "can_edit", "document:readme").deny()
    .on_check_any_subject("can_view", "document:readme").allow()
    .default_deny()
    .verify_on_destroy(true)
    .build();
```

### InMemoryClient

```cpp
auto client = inferadb::testing::InMemoryClient::with_schema_and_data(
    R"(
    type document {
        relation viewer
        relation editor
        relation can_view = viewer | editor
    }
    )",
    {
        {"document:readme", "editor", "user:alice"},
        {"document:readme", "viewer", "user:bob"},
    }
);
```

## Thread Safety

- `inferadb::Client` is thread-safe — a single client can be shared across threads
- `inferadb::Vault` handles are lightweight and safe to copy across threads
- The C API is thread-safe when each thread uses its own `inferadb_vault_t*`, or when access to a shared vault is externally synchronized
- All `inferadb_*_free` calls are safe to call from any thread

## Platform Support

| Platform | Architecture    | Status      |
| -------- | --------------- | ----------- |
| Linux    | x86_64, aarch64 | Supported   |
| macOS    | x86_64, arm64   | Supported   |
| Windows  | x86_64          | Supported   |
| FreeBSD  | x86_64          | Best-effort |

Prebuilt binaries are available for all supported platforms via the GitHub releases page and vcpkg.
