---
layout: docs
title: Dashboard — InferaDB
doc_title: Dashboard
doc_subtitle: A web-based management interface for InferaDB tenants, policies, and authorization data.
---

## Overview

The InferaDB Dashboard is a single-page application for managing your authorization infrastructure. It provides visual tools for editing IPL policies, exploring relationships, simulating authorization decisions, and reviewing audit logs.

## Features

### Tenant Management

Create, configure, and manage organizations and vaults from a unified interface. The dashboard supports the full Organization → Vault hierarchy, letting you:

- Create and configure organizations
- Provision and manage vaults within each organization
- Manage team membership and user grants
- View vault-level metrics and health status

### IPL Policy Editor

A built-in code editor for writing and managing [IPL schemas](/docs/ipl):

- **Syntax highlighting** — IPL keywords, types, relations, and operators are highlighted for readability
- **Real-time validation** — Schema errors are surfaced inline as you type, with line-level diagnostics
- **Push to Engine** — Deploy schema changes directly from the editor

### Decision Simulator

Test authorization checks interactively without writing code:

1. Select a vault and schema version
2. Enter a subject, relation, and resource
3. Run the check and inspect the result, including the evaluation trace and timing

The simulator is useful for debugging unexpected ALLOW or DENY results — the evaluation trace shows exactly which relations were traversed.

### Relationship Graph Visualizer

An interactive graph view of your authorization data. Entities are rendered as nodes and relationships as directed edges, making it straightforward to:

- Explore how permissions are connected across your entity hierarchy
- Identify unexpected paths between subjects and resources
- Filter by type, relation, or entity ID

### Audit Explorer

Browse and search the immutable audit trail. Each entry includes:

- Timestamp
- Decision result (ALLOW / DENY)
- Request parameters (subject, relation, resource)
- Policy version and revision token
- Cryptographic signature

Filter by time range, subject, resource, result, or vault.

## Configuration

The dashboard connects to the Engine and Control APIs via two environment variables:

| Variable          | Default                 | Description                      |
| ----------------- | ----------------------- | -------------------------------- |
| `CONTROL_API_URL` | `http://localhost:8081` | Control plane API endpoint       |
| `ENGINE_API_URL`  | `http://localhost:8080` | Engine (data plane) API endpoint |

## Development

Start the dashboard development server:

```bash
cd dashboard
npm install
npm run dev
```

The dev server runs at [http://localhost:5173](http://localhost:5173) with hot module replacement enabled.

### Running Tests

```bash
npm run test        # Run unit tests via Vitest
npm run test:watch  # Watch mode
```

## Accessing the Dashboard

When running the full local stack via `inferadb dev start`, the dashboard is available at [http://localhost:3000](http://localhost:3000). In Kubernetes deployments, use `kubectl port-forward` to access it:

```bash
kubectl port-forward svc/inferadb-dashboard 3000:3000
```
