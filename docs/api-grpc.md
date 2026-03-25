---
layout: docs
title: gRPC API — InferaDB
doc_title: gRPC API Reference
doc_subtitle: Protocol Buffers service definition for the InferaDB Engine.
---

The Engine exposes a gRPC API on port **8081** (default). Typically 20-30% faster than REST.

## Service Definition

```protobuf
service AuthorizationService {
    rpc Evaluate(stream EvaluateRequest) returns (stream EvaluateResponse);
    rpc Expand(ExpandRequest) returns (stream ExpandResponse);
    rpc WriteRelationships(stream WriteRequest) returns (WriteResponse);
    rpc DeleteRelationships(stream DeleteRequest) returns (DeleteResponse);
    rpc ListResources(ListResourcesRequest) returns (stream ListResourcesResponse);
    rpc ListRelationships(ListRelationshipsRequest) returns (stream ListRelationshipsResponse);
    rpc ListSubjects(ListSubjectsRequest) returns (stream ListSubjectsResponse);
    rpc Watch(WatchRequest) returns (stream WatchResponse);
    rpc Simulate(SimulateRequest) returns (SimulateResponse);
    rpc Health(HealthRequest) returns (HealthResponse);
}
```

The proto definitions are at [`engine/proto/inferadb/authorization/v1/authorization.proto`](https://github.com/inferadb/engine/tree/main/proto).

## RPC Methods

| RPC                   | Streaming     | Description                                                           |
| --------------------- | ------------- | --------------------------------------------------------------------- |
| `Evaluate`            | Bidirectional | Permission check (batch via streaming)                                |
| `Expand`              | Server        | Expand relation to userset tree                                       |
| `WriteRelationships`  | Client        | Write relationships (batch)                                           |
| `DeleteRelationships` | Client        | Delete by exact match or filter                                       |
| `ListResources`       | Server        | List accessible resources (with cursor pagination, wildcard patterns) |
| `ListRelationships`   | Server        | List relationships with filters                                       |
| `ListSubjects`        | Server        | List subjects with relation to resource                               |
| `Watch`               | Server        | Real-time relationship change events                                  |
| `Simulate`            | Unary         | What-if testing with ephemeral relationships                          |
| `Health`              | Unary         | Health check                                                          |

## Connection

```bash
# Using grpcurl
grpcurl -plaintext localhost:8081 list
grpcurl -plaintext -d '{"resource":"document:readme","permission":"can_view","subject":"user:alice"}' \
  localhost:8081 inferadb.authorization.v1.AuthorizationService/Evaluate
```

## Authentication

Pass the JWT as a metadata header:

```
authorization: Bearer <token>
```

## Error Codes

| gRPC Status          | Meaning                        |
| -------------------- | ------------------------------ |
| `OK`                 | Success                        |
| `INVALID_ARGUMENT`   | Malformed request              |
| `UNAUTHENTICATED`    | Missing or invalid credentials |
| `NOT_FOUND`          | Resource not found             |
| `RESOURCE_EXHAUSTED` | Rate limited                   |
| `INTERNAL`           | Server error                   |
