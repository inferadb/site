---
layout: docs
title: Go SDK — InferaDB
doc_title: Go SDK
doc_subtitle: Idiomatic Go client for InferaDB.
---

> **Coming soon.** The Go SDK is under active development. The API surface shown here is based on the [Rust SDK](/docs/sdk-rust) and may change before release.

Typed, context-aware client for InferaDB. Requires Go 1.22+.

## Installation

```bash
go get github.com/inferadb/go
```

## Authentication

Three authentication methods:

| Method | Use Case | Security |
|--------|----------|----------|
| Client Credentials (Ed25519 JWT) | Service-to-service | High |
| Bearer Token | User sessions, OAuth | Medium |
| API Key | Testing, simple integrations | Basic |

### Client Credentials (Recommended)

```go
package main

import (
    "log"
    "os"

    inferadb "github.com/inferadb/go"
)

func main() {
    key, err := inferadb.Ed25519PrivateKeyFromPEMFile("client.pem")
    if err != nil {
        log.Fatal(err)
    }

    client, err := inferadb.NewClient(
        inferadb.WithURL("https://engine.inferadb.com"),
        inferadb.WithClientCredentials("my-client", key, "cert-id"),
    )
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()
}
```

### Bearer Token

```go
client, err := inferadb.NewClient(
    inferadb.WithURL("https://engine.inferadb.com"),
    inferadb.WithBearerToken(os.Getenv("INFERADB_TOKEN")),
)
```

### API Key

```go
client, err := inferadb.NewClient(
    inferadb.WithURL("https://engine.inferadb.com"),
    inferadb.WithAPIKey(os.Getenv("INFERADB_API_KEY")),
)
```

## Permission Checks

```go
vault := client.Organization("my-org").Vault("production")
ctx := context.Background()

allowed, err := vault.Check(ctx, "user:alice", "can_edit", "document:readme")
```

### With ABAC Context

```go
allowed, err := vault.Check(ctx, "user:alice", "can_view", "document:readme",
    inferadb.WithContext(map[string]any{"ip_address": "10.0.0.1"}),
)
```

### Require — Returns Error on Deny

```go
err := vault.Require(ctx, "user:alice", "can_edit", "document:readme")
if errors.Is(err, inferadb.ErrAccessDenied) {
    // permission denied
}
```

### With Consistency Token

```go
allowed, err := vault.Check(ctx, "user:alice", "can_view", "document:readme",
    inferadb.AtLeastAsFresh(revisionToken),
)
```

### Batch Check

```go
results, err := vault.CheckBatch(ctx, []inferadb.CheckRequest{
    {Subject: "user:alice", Permission: "can_edit", Resource: "document:readme"},
    {Subject: "user:bob", Permission: "can_view", Resource: "document:readme"},
})
if results.AllAllowed() {
    // all checks passed
}
```

## Relationships

### Write

```go
// Returns a revision token
token, err := vault.Relationships().Write(ctx, inferadb.Relationship{
    Resource: "document:readme",
    Relation: "editor",
    Subject:  "user:alice",
})
```

### Batch Write

```go
err := vault.Relationships().WriteBatch(ctx, []inferadb.Relationship{
    {Resource: "document:readme", Relation: "editor", Subject: "user:alice"},
    {Resource: "document:readme", Relation: "viewer", Subject: "user:bob"},
})
```

### List

```go
rels, err := vault.Relationships().List(ctx,
    inferadb.FilterByResource("document:readme"),
)
```

### Delete

```go
err := vault.Relationships().DeleteWhere(ctx,
    inferadb.FilterByResource("document:readme"),
    inferadb.FilterByRelation("viewer"),
    inferadb.FilterBySubject("user:bob"),
)
```

## Lookups

```go
// What resources can Alice view?
resources, err := vault.Resources().AccessibleBy(ctx, "user:alice",
    inferadb.LookupPermission("can_view"),
    inferadb.LookupResourceType("document"),
)

// Who can edit this document?
subjects, err := vault.Subjects().WithPermission(ctx, "can_edit",
    inferadb.LookupResource("document:readme"),
)
```

## Testing

### MockClient (Fastest)

Stub specific check results. Use `defer client.AssertExpectations(t)` to verify all stubs were hit.

```go
import inferadbtesting "github.com/inferadb/go/testing"

client := inferadbtesting.NewMockClient().
    OnCheck("user:alice", "can_edit", "document:readme").Allow().
    OnCheck("user:bob", "can_edit", "document:readme").Deny().
    OnCheckAnySubject("can_view", "document:readme").Allow().
    DefaultDeny().
    Build()

defer client.AssertExpectations(t)
```

### InMemoryClient (Full Policy Evaluation)

```go
import inferadbtesting "github.com/inferadb/go/testing"

client, err := inferadbtesting.NewInMemoryClient(
    `type document {
        relation viewer
        relation editor
        relation can_view = viewer | editor
    }`,
    []inferadb.Relationship{
        {Resource: "document:readme", Relation: "editor", Subject: "user:alice"},
        {Resource: "document:readme", Relation: "viewer", Subject: "user:bob"},
    },
)
```

### TestVault (Real Instance)

Cleanup registered automatically via `t.Cleanup`.

```go
import inferadbtesting "github.com/inferadb/go/testing"

vault := inferadbtesting.NewTestVault(t, org,
    inferadbtesting.WithSchema(schemaIPL),
)
```

## Error Handling

```go
allowed, err := vault.Check(ctx, "user:alice", "can_edit", "document:readme")
if err != nil {
    var inferaErr *inferadb.Error
    if errors.As(err, &inferaErr) {
        if inferaErr.IsRetriable() {
            time.Sleep(inferaErr.RetryAfter)
            // retry
        }
        log.Error("authorization error",
            "kind", inferaErr.Kind,
            "request_id", inferaErr.RequestID,
        )
    }
}
```

`ErrorKind` constants: `ErrKindUnauthorized`, `ErrKindForbidden`, `ErrKindNotFound`, `ErrKindRateLimited`, `ErrKindSchemaViolation`, `ErrKindUnavailable`, `ErrKindTimeout`, `ErrKindInvalidArgument`.

## Framework Integrations

### net/http Middleware (Go 1.22+)

```go
type ctxKey struct{}
var UserIDKey = ctxKey{}

func AuthorizationMiddleware(vault *inferadb.VaultClient) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            userID, _ := r.Context().Value(UserIDKey).(string)
            docID := r.PathValue("id") // Go 1.22+ stdlib routing

            if err := vault.Require(r.Context(),
                "user:"+userID, "can_view", "document:"+docID,
            ); err != nil {
                http.Error(w, "Forbidden", http.StatusForbidden)
                return
            }

            next.ServeHTTP(w, r)
        })
    }
}
```

### gRPC Interceptor

```go
import "google.golang.org/grpc/metadata"

func AuthUnaryInterceptor(vault *inferadb.VaultClient) grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req any, info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler) (any, error) {

        md, ok := metadata.FromIncomingContext(ctx)
        if !ok {
            return nil, status.Errorf(codes.Unauthenticated, "missing metadata")
        }
        values := md.Get("x-user-id")
        if len(values) == 0 {
            return nil, status.Errorf(codes.Unauthenticated, "missing user id")
        }
        userID := values[0]

        if err := vault.Require(ctx, "user:"+userID, "access", "rpc:"+info.FullMethod); err != nil {
            return nil, status.Errorf(codes.PermissionDenied, "access denied")
        }

        return handler(ctx, req)
    }
}
```
