---
layout: docs
title: Terraform Provider
doc_title: Terraform Provider
doc_subtitle: Manage InferaDB infrastructure as code.
---

Manage organizations, vaults, clients, teams, and access grants declaratively.

**Registry:** `inferadb/inferadb`

## Provider Configuration

```hcl
terraform {
  required_providers {
    inferadb = {
      source  = "inferadb/inferadb"
      version = "~> 0.1"
    }
  }
}

provider "inferadb" {
  endpoint      = "https://api.inferadb.com"
  session_token = var.inferadb_session_token
}
```

Authenticate via `session_token` in the provider block or `INFERADB_SESSION_TOKEN` env var (from `inferadb login`).

## Resources

### `inferadb_organization`

```hcl
resource "inferadb_organization" "main" {
  name = "my-company"
  tier = "TIER_PRO_V1"
}
```

### `inferadb_vault`

```hcl
resource "inferadb_vault" "production" {
  organization_id = inferadb_organization.main.id
  name            = "production"
  description     = "Production authorization data"
}
```

### `inferadb_client`

```hcl
resource "inferadb_client" "backend" {
  organization_id = inferadb_organization.main.id
  vault_id        = inferadb_vault.production.id
  name            = "backend-service"
}
```

### `inferadb_client_certificate`

```hcl
resource "inferadb_client_certificate" "backend_cert" {
  organization_id = inferadb_organization.main.id
  client_id       = inferadb_client.backend.id
  name            = "primary"
}

# private_key_pem is sensitive, only available at creation
output "private_key" {
  value     = inferadb_client_certificate.backend_cert.private_key_pem
  sensitive = true
}
```

### `inferadb_team`

```hcl
resource "inferadb_team" "engineering" {
  organization_id = inferadb_organization.main.id
  name            = "engineering"
}
```

### `inferadb_team_member`

```hcl
resource "inferadb_team_member" "alice" {
  organization_id = inferadb_organization.main.id
  team_id         = inferadb_team.engineering.id
  user_id         = "user-id"
}
```

### `inferadb_vault_user_grant` / `inferadb_vault_team_grant`

```hcl
resource "inferadb_vault_team_grant" "eng_production" {
  organization_id = inferadb_organization.main.id
  vault_id        = inferadb_vault.production.id
  team_id         = inferadb_team.engineering.id
  role            = "WRITER"
}
```

## Data Sources

- `data "inferadb_organization"` — Read organization data
- `data "inferadb_vault"` — Read vault data
- `data "inferadb_client"` — Read client data
- `data "inferadb_team"` — Read team data
