---
layout: docs
title: TypeScript SDK — InferaDB
doc_title: TypeScript SDK
doc_subtitle: Idiomatic Node.js and TypeScript client for InferaDB.
---

> **Coming soon.** The TypeScript SDK is under active development. The API surface shown here is based on the [Rust SDK](/docs/sdk-rust) and may change before release.

Fully typed async client for InferaDB. Works with Node.js 18+, Bun, and Deno.

## Installation

```bash
npm install @inferadb/sdk
```

## Authentication

Three authentication methods:

| Method | Use Case | Security |
|--------|----------|----------|
| Client Credentials (Ed25519 JWT) | Service-to-service | High |
| Bearer Token | User sessions, OAuth | Medium |
| API Key | Testing, simple integrations | Basic |

### Client Credentials (Recommended)

```typescript
import { InferaDB, Ed25519PrivateKey } from "@inferadb/sdk";

async function main() {
  const client = new InferaDB({
    url: "https://engine.inferadb.com",
    credentials: {
      clientId: "my-client",
      privateKey: await Ed25519PrivateKey.fromPemFile("client.pem"),
      certificateId: "cert-id",
    },
  });
}
```

### Bearer Token

```typescript
const client = new InferaDB({
  url: "https://engine.inferadb.com",
  token: process.env.INFERADB_TOKEN,
});
```

### API Key

```typescript
const client = new InferaDB({
  url: "https://engine.inferadb.com",
  apiKey: process.env.INFERADB_API_KEY,
});
```

## Permission Checks

```typescript
const vault = client.organization("my-org").vault("production");

const allowed = await vault.check("user:alice", "can_edit", "document:readme");
```

### With ABAC Context

```typescript
// Context keys are schema-defined
const allowed = await vault.check("user:alice", "can_view", "document:readme", {
  context: { ip_address: "10.0.0.1" },
});
```

### Require — Throws on Deny

```typescript
// Throws AccessDeniedError if permission is denied
await vault.require("user:alice", "can_edit", "document:readme");
```

### With Consistency Token

```typescript
const allowed = await vault.check("user:alice", "can_view", "document:readme", {
  atLeastAsFresh: revisionToken,
});
```

### Batch Check

```typescript
const results = await vault.checkBatch([
  { subject: "user:alice", permission: "can_edit", resource: "document:readme" },
  { subject: "user:bob", permission: "can_view", resource: "document:readme" },
]);

if (results.allAllowed()) {
  // all checks passed
}
```

## Relationships

### Write

```typescript
// Returns a revision token
const token = await vault.relationships.write({
  resource: "document:readme",
  relation: "editor",
  subject: "user:alice",
});
```

### Batch Write

```typescript
await vault.relationships.writeBatch([
  { resource: "document:readme", relation: "editor", subject: "user:alice" },
  { resource: "document:readme", relation: "viewer", subject: "user:bob" },
]);
```

### List

```typescript
const rels = await vault.relationships
  .list({ resource: "document:readme" })
  .collect();
```

### Delete

```typescript
await vault.relationships.deleteWhere({
  resource: "document:readme",
  relation: "viewer",
  subject: "user:bob",
});
```

## Lookups

```typescript
// What resources can Alice view?
const resources = await vault.resources
  .accessibleBy("user:alice")
  .withPermission("can_view")
  .resourceType("document")
  .collect();

// Who can edit this document?
const subjects = await vault.subjects
  .withPermission("can_edit")
  .onResource("document:readme")
  .collect();
```

## Testing

### MockClient (Fastest)

Stub specific check results. Call `assertExpectations()` to verify all stubs were hit.

```typescript
import { MockClient } from "@inferadb/sdk/testing";

const client = new MockClient()
  .onCheck("user:alice", "can_edit", "document:readme").allow()
  .onCheck("user:bob", "can_edit", "document:readme").deny()
  .onCheckAnySubject("can_view", "document:readme").allow()
  .defaultDeny();

client.assertExpectations();
```

### InMemoryClient (Full Policy Evaluation)

```typescript
import { InMemoryClient } from "@inferadb/sdk/testing";

const client = await InMemoryClient.withSchemaAndData(
  `
  type document {
      relation viewer
      relation editor
      relation can_view = viewer | editor
  }
  `,
  [
    { resource: "document:readme", relation: "editor", subject: "user:alice" },
    { resource: "document:readme", relation: "viewer", subject: "user:bob" },
  ],
);
```

### TestVault (Real Instance)

Auto-cleans up on dispose. Call `vault.preserve()` to keep data for debugging.

```typescript
import { TestVault } from "@inferadb/sdk/testing";

const vault = await TestVault.create(org, { schema: schemaIpl });
```

## Error Handling

```typescript
import { AccessDeniedError, InferaDBError } from "@inferadb/sdk";

try {
  await vault.require("user:alice", "can_edit", "document:readme");
} catch (error) {
  if (error instanceof AccessDeniedError) {
    // permission denied
  } else if (error instanceof InferaDBError) {
    if (error.isRetriable) {
      // retry after error.retryAfter milliseconds
    }
    console.error(error.kind, error.requestId);
  }
}
```

`ErrorKind` values: `"unauthorized"`, `"forbidden"`, `"not_found"`, `"rate_limited"`, `"schema_violation"`, `"unavailable"`, `"timeout"`, `"invalid_argument"`.

## Framework Integrations

### Express Middleware

```typescript
import { inferadbMiddleware } from "@inferadb/sdk/express";

app.use(
  "/api/documents/:id",
  inferadbMiddleware(vault, {
    subject: (req) => `user:${req.user.id}`,
    resource: (req) => `document:${req.params.id}`,
    permission: (req) => (req.method === "GET" ? "can_view" : "can_edit"),
  }),
);
```

### Next.js

```typescript
import { withAuthorization } from "@inferadb/sdk/next";

export const GET = withAuthorization(vault, {
  subject: (req) => `user:${req.auth.userId}`,
  resource: (req) => `document:${req.nextUrl.searchParams.get("id")}`,
  permission: "can_view",
})(async (req) => {
  return Response.json({ data: "authorized content" });
});
```
