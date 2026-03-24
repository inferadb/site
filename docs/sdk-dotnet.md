---
layout: docs
title: .NET SDK — InferaDB
doc_title: .NET SDK
doc_subtitle: Async C# client for InferaDB with ASP.NET Core integration.
---

> **Coming soon.** The .NET SDK is under active development. The API surface shown here is based on the [Rust SDK](/docs/sdk-rust) and may change before release.

The official .NET SDK (`InferaDB.Sdk`) provides an async, strongly-typed client for InferaDB's authorization APIs. Targets .NET 8+ and integrates with ASP.NET Core's authorization system.

## Installation

```bash
dotnet add package InferaDB.Sdk
```

## Authentication

Three authentication methods:

| Method | Use Case | Security |
|--------|----------|----------|
| Client Credentials (Ed25519 JWT) | Service-to-service | High |
| Bearer Token | User sessions, OAuth | Medium |
| API Key | Testing, simple integrations | Basic |

### Client Credentials (Recommended)

```csharp
using InferaDB;

var client = new InferaDBClient(new InferaDBOptions
{
    Url = "https://engine.inferadb.com",
    Credentials = new ClientCredentials
    {
        ClientId = "my-client",
        PrivateKey = Ed25519PrivateKey.FromPemFile("client.pem"),
        CertificateId = "cert-id",
    },
});
```

### Dependency Injection (Recommended for ASP.NET Core)

```csharp
builder.Services.AddInferaDB(options =>
{
    options.Url = "https://engine.inferadb.com";
    options.Credentials = new ClientCredentials
    {
        ClientId = "my-client",
        PrivateKey = Ed25519PrivateKey.FromPemFile("client.pem"),
        CertificateId = "cert-id",
    };
});
```

### API Key

```csharp
var client = new InferaDBClient(new InferaDBOptions
{
    Url = "https://engine.inferadb.com",
    ApiKey = Environment.GetEnvironmentVariable("INFERADB_API_KEY"),
});
```

## Permission Checks

```csharp
var vault = client.Organization("my-org").Vault("production");

// Simple check
bool allowed = await vault.CheckAsync("user:alice", "can_edit", "document:readme");
```

### With ABAC Context

```csharp
bool allowed = await vault.CheckAsync("user:alice", "can_view", "document:readme",
    new CheckOptions
    {
        Context = new Dictionary<string, object> { ["ip_address"] = "10.0.0.1" },
    });
```

### Require — Throws on Deny

```csharp
// Throws AccessDeniedException if permission is denied
await vault.RequireAsync("user:alice", "can_edit", "document:readme");
```

### With Consistency Token

```csharp
bool allowed = await vault.CheckAsync("user:alice", "can_view", "document:readme",
    new CheckOptions { AtLeastAsFresh = revisionToken });
```

### Batch Check

```csharp
var results = await vault.CheckBatchAsync(
[
    new CheckRequest("user:alice", "can_edit", "document:readme"),
    new CheckRequest("user:bob", "can_view", "document:readme"),
]);
if (results.AllAllowed)
{
    // all checks passed
}
```

## Relationships

### Write

```csharp
// Returns a revision token
var token = await vault.Relationships.WriteAsync(
    new Relationship("document:readme", "editor", "user:alice"));
```

### Batch Write

```csharp
await vault.Relationships.WriteBatchAsync(
[
    new Relationship("document:readme", "editor", "user:alice"),
    new Relationship("document:readme", "viewer", "user:bob"),
]);
```

### List

`List` returns an `IAsyncEnumerable<Relationship>`:

```csharp
var rels = await vault.Relationships
    .List(resource: "document:readme")
    .ToListAsync();
```

### Delete

```csharp
await vault.Relationships.DeleteWhereAsync(
    resource: "document:readme",
    relation: "viewer",
    subject: "user:bob");
```

## Lookups

`AccessibleBy` and `WithPermission` return `IAsyncEnumerable<T>`:

```csharp
// What resources can Alice view?
var resources = await vault.Resources
    .AccessibleBy("user:alice")
    .WithPermission("can_view")
    .ResourceType("document")
    .ToListAsync();

// Who can edit this document?
var subjects = await vault.Subjects
    .WithPermission("can_edit")
    .OnResource("document:readme")
    .ToListAsync();
```

## Testing

Three approaches with different trade-offs:

### MockClient (Fastest)

```csharp
using InferaDB.Testing;

var client = MockClient.Builder()
    .OnCheck("user:alice", "can_edit", "document:readme").Allow()
    .OnCheck("user:bob", "can_edit", "document:readme").Deny()
    .OnCheckAnySubject("can_view", "document:readme").Allow()
    .DefaultDeny()
    .VerifyOnDispose(true)
    .Build();
```

Setting `VerifyOnDispose(true)` asserts that all registered expectations were invoked when the client is disposed — preventing silent untested assumptions. Use with `using` for automatic verification.

### InMemoryClient (Full Policy Evaluation)

```csharp
using InferaDB.Testing;

var client = InMemoryClient.WithSchemaAndData(
    schema: """
        type document {
            relation viewer
            relation editor
            relation can_view = viewer | editor
        }
        """,
    data:
    [
        new Relationship("document:readme", "editor", "user:alice"),
        new Relationship("document:readme", "viewer", "user:bob"),
    ]);
```

### TestVault (Real Instance)

```csharp
using InferaDB.Testing;

await using var vault = await TestVault.CreateAsync(org, schemaIpl);
// vault auto-cleans up on dispose
// call vault.Preserve() to keep data for debugging
```

## Error Handling

```csharp
using InferaDB;

try
{
    await vault.RequireAsync("user:alice", "can_edit", "document:readme");
}
catch (AccessDeniedException)
{
    // permission denied
}
catch (InferaDBException ex)
{
    if (ex.IsRetriable)
    {
        // retry after ex.RetryAfter
    }
    logger.LogError("Authorization error: Kind={Kind}, RequestId={RequestId}",
        ex.Kind, ex.RequestId);
}
```

`ErrorKind` enum: `Unauthorized`, `Forbidden`, `NotFound`, `RateLimited`, `SchemaViolation`, `Unavailable`, `Timeout`, `InvalidArgument`.

## Framework Integrations

### ASP.NET Core Authorization Policy

```csharp
using InferaDB.AspNetCore;

builder.Services.AddAuthorization(options =>
{
    options.AddInferaDBPolicy("CanEditDocument", policy =>
    {
        policy.RequirePermission("can_edit");
        policy.WithSubject(ctx => $"user:{ctx.User.FindFirst("sub")?.Value}");
        policy.WithResource(ctx =>
            $"document:{ctx.HttpContext?.GetRouteValue("id")}");
    });
});
```

```csharp
[Authorize(Policy = "CanEditDocument")]
[HttpPut("{id}")]
public async Task<IActionResult> UpdateDocument(string id, DocumentDto dto)
{
    // only reached if authorized
    return Ok(await documentService.Update(id, dto));
}
```

### Minimal API

```csharp
app.MapGet("/documents/{id}", async (
    string id,
    IInferaDBClient client,
    ClaimsPrincipal user,
    IDocumentService documentService) =>
{
    var vault = client.Organization("my-org").Vault("production");
    var userId = user.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException();
    await vault.RequireAsync($"user:{userId}", "can_view", $"document:{id}");
    return Results.Ok(await documentService.FindById(id));
})
.RequireAuthorization();
```
