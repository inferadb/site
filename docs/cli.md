---
layout: docs
title: CLI — InferaDB
doc_title: CLI Reference
doc_subtitle: "The inferadb command-line interface for managing authorization."
---

Full access to InferaDB's authorization, schema, and administration from the terminal.

## Installation

```bash
cargo install inferadb-cli
```

Shell completions:

```bash
inferadb completion bash >> ~/.bashrc
inferadb completion zsh >> ~/.zshrc
inferadb completion fish > ~/.config/fish/completions/inferadb.fish
```

## Command Groups

### Authentication

| Command             | Description                          |
| ------------------- | ------------------------------------ |
| `inferadb login`    | Authenticate via browser (PKCE flow) |
| `inferadb logout`   | Revoke current session               |
| `inferadb register` | Create a new account                 |
| `inferadb whoami`   | Show current user and organization   |

### Permission Queries

| Command                                                         | Description                            |
| --------------------------------------------------------------- | -------------------------------------- |
| `inferadb check <resource> <permission> <subject>`              | Check a permission                     |
| `inferadb simulate`                                             | What-if testing with ephemeral changes |
| `inferadb expand <resource> <relation>`                         | Expand a relation tree                 |
| `inferadb explain-permission <resource> <permission> <subject>` | Show the decision path                 |
| `inferadb list-resources <subject> <permission> [type]`         | List accessible resources              |
| `inferadb list-subjects <resource> <permission> [type]`         | List subjects with access              |

### Data Management

| Command                                                         | Description                 |
| --------------------------------------------------------------- | --------------------------- |
| `inferadb relationships add <subject> <relation> <resource>`    | Add a relationship          |
| `inferadb relationships remove <subject> <relation> <resource>` | Remove a relationship       |
| `inferadb export`                                               | Export relationships        |
| `inferadb import`                                               | Import relationships        |
| `inferadb stream`                                               | Stream relationship changes |
| `inferadb stats`                                                | Show vault statistics       |
| `inferadb what-changed`                                         | Show recent changes         |

### Schema Management

| Command                            | Description                      |
| ---------------------------------- | -------------------------------- |
| `inferadb schemas init`            | Create a new schema file         |
| `inferadb schemas push <file>`     | Push schema to InferaDB          |
| `inferadb schemas validate <file>` | Validate schema locally          |
| `inferadb schemas test`            | Run schema test assertions       |
| `inferadb schemas diff`            | Compare local and remote schemas |
| `inferadb schemas visualize`       | Render schema as a graph         |

### Administration

| Command            | Description          |
| ------------------ | -------------------- |
| `inferadb account` | Manage your account  |
| `inferadb orgs`    | Manage organizations |
| `inferadb tokens`  | Manage API tokens    |

### Development

| Command               | Description                     |
| --------------------- | ------------------------------- |
| `inferadb dev start`  | Start local development cluster |
| `inferadb dev stop`   | Stop local cluster              |
| `inferadb dev status` | Show cluster status             |
| `inferadb dev logs`   | View service logs               |
| `inferadb dev reset`  | Reset all local data            |
| `inferadb dev doctor` | Diagnose local environment      |

### Diagnostics

| Command           | Description                   |
| ----------------- | ----------------------------- |
| `inferadb status` | Show server status            |
| `inferadb ping`   | Test connectivity             |
| `inferadb doctor` | Diagnose configuration issues |
| `inferadb health` | Check service health          |

## Global Flags

| Flag                    | Description                                   |
| ----------------------- | --------------------------------------------- |
| `@<profile>`            | Use a named profile (e.g., `@prod check ...`) |
| `--org <id>`            | Override organization                         |
| `-v, --vault <id>`      | Override vault                                |
| `-o, --output <format>` | Output: `table`, `json`, `yaml`, `jsonl`      |
| `-q, --quiet`           | Suppress non-essential output                 |
| `-y, --yes`             | Skip confirmation prompts                     |
| `--debug`               | Enable debug logging                          |

## Configuration

**User config:** `~/.config/inferadb/cli.yaml`

```yaml
default_profile: dev
profiles:
  dev:
    url: http://localhost:8080
    org: my-org
    vault: dev-vault
  prod:
    url: https://engine.inferadb.com
    org: my-org
    vault: production
```

**Project config:** `.inferadb-cli.yaml` (in project root, overrides user config)

**Credentials** are stored in your OS keychain, not in config files.

**Environment variables:**

| Variable           | Description              |
| ------------------ | ------------------------ |
| `INFERADB_PROFILE` | Default profile name     |
| `INFERADB_URL`     | Engine URL override      |
| `INFERADB_ORG`     | Organization override    |
| `INFERADB_VAULT`   | Vault override           |
| `INFERADB_TOKEN`   | Bearer token (for CI/CD) |
| `INFERADB_DEBUG`   | Enable debug logging     |
| `NO_COLOR`         | Disable colored output   |

## Exit Codes

| Code | Meaning                             |
| ---- | ----------------------------------- |
| `0`  | Success / Allowed                   |
| `1`  | General error                       |
| `2`  | Invalid arguments                   |
| `3`  | Authentication required             |
| `4`  | Permission denied                   |
| `5`  | Not found                           |
| `6`  | Conflict                            |
| `7`  | Rate limited                        |
| `10` | Network error                       |
| `11` | Server error                        |
| `20` | Denied (authorization check)        |
| `21` | Indeterminate (authorization check) |
