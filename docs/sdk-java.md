---
layout: docs
title: Java SDK — InferaDB
doc_title: Java SDK
doc_subtitle: Type-safe Java client for InferaDB.
---

> **Coming soon.** The Java SDK is under active development. The API surface shown here is based on the [Rust SDK](/docs/sdk-rust) and may change before release.

Typed, fluent client for InferaDB. Requires Java 17+.

## Installation

### Maven

```xml
<dependency>
    <groupId>com.inferadb</groupId>
    <artifactId>inferadb-sdk</artifactId>
    <version>0.1.0</version>
</dependency>
```

### Gradle

```groovy
implementation "com.inferadb:inferadb-sdk:0.1.0"
```

## Authentication

Three authentication methods:

| Method | Use Case | Security |
|--------|----------|----------|
| Client Credentials (Ed25519 JWT) | Service-to-service | High |
| Bearer Token | User sessions, OAuth | Medium |
| API Key | Testing, simple integrations | Basic |

### Client Credentials (Recommended)

```java
import com.inferadb.InferaDB;
import com.inferadb.auth.Ed25519PrivateKey;
import com.inferadb.auth.ClientCredentials;

import java.nio.file.Path;

var key = Ed25519PrivateKey.fromPemFile(Path.of("client.pem"));

var client = InferaDB.builder()
    .url("https://engine.inferadb.com")
    .credentials(new ClientCredentials("my-client", key, "cert-id"))
    .build();
```

### Bearer Token

```java
var client = InferaDB.builder()
    .url("https://engine.inferadb.com")
    .bearerToken(System.getenv("INFERADB_TOKEN"))
    .build();
```

### API Key

```java
var client = InferaDB.builder()
    .url("https://engine.inferadb.com")
    .apiKey(System.getenv("INFERADB_API_KEY"))
    .build();
```

## Permission Checks

```java
var vault = client.organization("my-org").vault("production");

boolean allowed = vault.check("user:alice", "can_edit", "document:readme");
```

### With ABAC Context

```java
import java.util.Map;

boolean allowed = vault.check("user:alice", "can_view", "document:readme",
    CheckOptions.builder()
        .context(Map.of("ip_address", "10.0.0.1"))
        .build());
```

### Require — Throws on Deny

```java
// Throws AccessDeniedException if permission is denied
vault.require("user:alice", "can_edit", "document:readme");
```

### With Consistency Token

```java
boolean allowed = vault.check("user:alice", "can_view", "document:readme",
    CheckOptions.builder()
        .atLeastAsFresh(revisionToken)
        .build());
```

### Batch Check

```java
import java.util.List;

var results = vault.checkBatch(List.of(
    new CheckRequest("user:alice", "can_edit", "document:readme"),
    new CheckRequest("user:bob", "can_view", "document:readme")
));
if (results.allAllowed()) {
    // all checks passed
}
```

## Relationships

### Write

```java
// Returns a revision token
var token = vault.relationships().write(
    new Relationship("document:readme", "editor", "user:alice"));
```

### Batch Write

```java
vault.relationships().writeBatch(List.of(
    new Relationship("document:readme", "editor", "user:alice"),
    new Relationship("document:readme", "viewer", "user:bob")
));
```

### List

```java
var rels = vault.relationships()
    .list()
    .resource("document:readme")
    .collect();
```

### Delete

```java
vault.relationships()
    .deleteWhere()
    .resource("document:readme")
    .relation("viewer")
    .subject("user:bob")
    .execute();
```

## Lookups

```java
// What resources can Alice view?
var resources = vault.resources()
    .accessibleBy("user:alice")
    .withPermission("can_view")
    .resourceType("document")
    .collect();

// Who can edit this document?
var subjects = vault.subjects()
    .withPermission("can_edit")
    .onResource("document:readme")
    .collect();
```

## Testing

### MockClient (Fastest)

Stub specific check results. With `verifyOnClose(true)`, all expectations are asserted on `client.close()` -- use with try-with-resources.

```java
import com.inferadb.testing.MockClient;

var client = MockClient.builder()
    .onCheck("user:alice", "can_edit", "document:readme").allow()
    .onCheck("user:bob", "can_edit", "document:readme").deny()
    .onCheckAnySubject("can_view", "document:readme").allow()
    .defaultDeny()
    .verifyOnClose(true)
    .build();
```

### InMemoryClient (Full Policy Evaluation)

```java
import com.inferadb.testing.InMemoryClient;

var client = InMemoryClient.withSchemaAndData(
    """
    type document {
        relation viewer
        relation editor
        relation can_view = viewer | editor
    }
    """,
    List.of(
        new Relationship("document:readme", "editor", "user:alice"),
        new Relationship("document:readme", "viewer", "user:bob")
    )
);
```

### TestVault (Real Instance)

Auto-cleans up on close via try-with-resources.

```java
import com.inferadb.testing.TestVault;

try (var vault = TestVault.create(org, schemaIpl)) {
    boolean allowed = vault.check("user:alice", "can_edit", "document:readme");
}
```

## Error Handling

```java
import com.inferadb.InferaDBException;
import com.inferadb.AccessDeniedException;

try {
    vault.require("user:alice", "can_edit", "document:readme");
} catch (AccessDeniedException e) {
    // permission denied
} catch (InferaDBException e) {
    if (e.isRetriable()) {
        // retry after e.getRetryAfter()
    }
    logger.error("Authorization error: kind={}, requestId={}",
        e.getKind(), e.getRequestId());
}
```

`ErrorKind` enum: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `RATE_LIMITED`, `SCHEMA_VIOLATION`, `UNAVAILABLE`, `TIMEOUT`, `INVALID_ARGUMENT`.

## Framework Integrations

### Spring Boot

```java
import com.inferadb.spring.RequirePermission;

@RestController
@RequestMapping("/documents")
public class DocumentController {

    @GetMapping("/{id}")
    @RequirePermission(
        subject = "#{authentication.name}",
        permission = "can_view",
        resource = "'document:' + #id"
    )
    public Document getDocument(@PathVariable String id) {
        return documentService.findById(id);
    }
}
```

### Spring Security Integration

```java
import com.inferadb.spring.InferaDBAuthorizationManager;

@Bean
SecurityFilterChain filterChain(HttpSecurity http,
        InferaDBAuthorizationManager authz) throws Exception {
    return http
        .authorizeHttpRequests(requests -> requests
            .requestMatchers("/api/**").access(authz)
            .anyRequest().permitAll()
        )
        .build();
}
```
