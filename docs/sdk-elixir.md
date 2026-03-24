---
layout: docs
title: Elixir SDK — InferaDB
doc_title: Elixir SDK
doc_subtitle: Idiomatic Elixir client for InferaDB with Phoenix integration.
---

> **Coming soon.** The Elixir SDK is under active development. The API surface shown here is based on the [Rust SDK](/docs/sdk-rust) and may change before release.

The official Elixir SDK (`inferadb`) provides a fault-tolerant, process-based client for InferaDB's authorization APIs. Requires Elixir 1.16+ / OTP 26+ and integrates with Phoenix and any Plug-based application.

## Installation

```elixir
# mix.exs
defp deps do
  [
    {:inferadb, "~> 0.1"}
  ]
end
```

```bash
mix deps.get
```

## Configuration

```elixir
# config/runtime.exs
config :inferadb,
  url: System.fetch_env!("INFERADB_URL"),
  credentials: [
    client_id: System.fetch_env!("INFERADB_CLIENT_ID"),
    private_key_path: System.fetch_env!("INFERADB_KEY_PATH"),
    certificate_id: System.fetch_env!("INFERADB_CERT_ID")
  ],
  organization: System.fetch_env!("INFERADB_ORG"),
  vault: System.fetch_env!("INFERADB_VAULT")
```

Add the client to your supervision tree:

```elixir
# lib/my_app/application.ex
children = [
  {InferaDB, name: MyApp.InferaDB}
]
```

## Authentication

Three authentication methods:

| Method                           | Use Case                     | Security |
| -------------------------------- | ---------------------------- | -------- |
| Client Credentials (Ed25519 JWT) | Service-to-service           | High     |
| Bearer Token                     | User sessions, OAuth         | Medium   |
| API Key                          | Testing, simple integrations | Basic    |

### Client Credentials (Recommended)

Configured via the application config above, or explicitly:

```elixir
{:ok, client} = InferaDB.start_link(
  url: "https://engine.inferadb.com",
  credentials: [
    client_id: "my-client",
    private_key_path: "client.pem",
    certificate_id: "cert-id"
  ]
)
```

### Bearer Token

```elixir
{:ok, client} = InferaDB.start_link(
  url: "https://engine.inferadb.com",
  token: System.fetch_env!("INFERADB_TOKEN")
)
```

## Permission Checks

```elixir
vault = InferaDB.organization(MyApp.InferaDB, "my-org") |> InferaDB.vault("production")

# Simple check — returns {:ok, true} or {:ok, false}
{:ok, true} = InferaDB.check(vault, "user:alice", "can_edit", "document:readme")
```

### With ABAC Context

```elixir
{:ok, allowed} = InferaDB.check(vault, "user:alice", "can_view", "document:readme",
  context: %{ip_address: "10.0.0.1"}
)
```

### Require — Returns :ok or :error

```elixir
case InferaDB.require(vault, "user:alice", "can_edit", "document:readme") do
  :ok -> # permitted
  {:error, :access_denied} -> # denied
  {:error, reason} -> # other error
end
```

### Require! — Raises on Deny

```elixir
# Raises InferaDB.AccessDeniedError
InferaDB.require!(vault, "user:alice", "can_edit", "document:readme")
```

### With Consistency Token

```elixir
{:ok, allowed} = InferaDB.check(vault, "user:alice", "can_view", "document:readme",
  at_least_as_fresh: revision_token
)
```

### Batch Check

```elixir
{:ok, results} = InferaDB.check_batch(vault, [
  {"user:alice", "can_edit", "document:readme"},
  {"user:bob", "can_view", "document:readme"},
])

results.all_allowed? # => true/false
```

## Relationships

### Write

```elixir
# Returns {:ok, revision_token}
{:ok, token} = InferaDB.write_relationship(vault,
  resource: "document:readme",
  relation: "editor",
  subject: "user:alice"
)
```

### Batch Write

```elixir
{:ok, token} = InferaDB.write_relationships(vault, [
  %{resource: "document:readme", relation: "editor", subject: "user:alice"},
  %{resource: "document:readme", relation: "viewer", subject: "user:bob"},
])
```

### List

```elixir
{:ok, rels} = InferaDB.list_relationships(vault,
  resource: "document:readme"
)
```

### Delete

```elixir
:ok = InferaDB.delete_relationships(vault,
  resource: "document:readme",
  relation: "viewer",
  subject: "user:bob"
)
```

## Lookups

```elixir
# What resources can Alice view?
{:ok, resources} = InferaDB.list_resources(vault, "user:alice",
  permission: "can_view",
  resource_type: "document"
)

# Who can edit this document?
{:ok, subjects} = InferaDB.list_subjects(vault, "document:readme",
  permission: "can_edit"
)
```

## Testing

Three approaches with different trade-offs:

### MockClient (Fastest)

```elixir
# test/support/inferadb_mock.ex
alias InferaDB.Testing.MockClient

client = MockClient.new()
  |> MockClient.on_check("user:alice", "can_edit", "document:readme", :allow)
  |> MockClient.on_check("user:bob", "can_edit", "document:readme", :deny)
  |> MockClient.on_check_any_subject("can_view", "document:readme", :allow)
  |> MockClient.default_deny()

# Verify all expectations were met
MockClient.verify!(client)
```

### InMemoryClient (Full Policy Evaluation)

```elixir
alias InferaDB.Testing.InMemoryClient

{:ok, client} = InMemoryClient.start_link(
  schema: """
  type document {
      relation viewer
      relation editor
      relation can_view = viewer | editor
  }
  """,
  data: [
    %{resource: "document:readme", relation: "editor", subject: "user:alice"},
    %{resource: "document:readme", relation: "viewer", subject: "user:bob"},
  ]
)
```

### TestVault (Real Instance)

```elixir
alias InferaDB.Testing.TestVault

{:ok, vault} = TestVault.create(org, schema: schema_ipl)
# vault auto-cleans up when the process stops
```

### ExUnit Integration

```elixir
defmodule MyApp.DocumentAuthorizationTest do
  use ExUnit.Case, async: true

  alias InferaDB.Testing.InMemoryClient

  setup do
    {:ok, client} = InMemoryClient.start_link(
      schema: "...",
      data: [%{resource: "document:readme", relation: "editor", subject: "user:alice"}]
    )

    vault = InferaDB.organization(client, "test") |> InferaDB.vault("test")
    %{vault: vault}
  end

  test "Alice can edit", %{vault: vault} do
    assert {:ok, true} = InferaDB.check(vault, "user:alice", "can_edit", "document:readme")
  end

  test "Bob cannot edit", %{vault: vault} do
    assert {:ok, false} = InferaDB.check(vault, "user:bob", "can_edit", "document:readme")
  end
end
```

## Error Handling

InferaDB follows Elixir conventions with `{:ok, result}` / `{:error, reason}` tuples and bang (`!`) variants that raise:

```elixir
case InferaDB.check(vault, "user:alice", "can_edit", "document:readme") do
  {:ok, true} -> :allowed
  {:ok, false} -> :denied
  {:error, %InferaDB.Error{kind: :rate_limited, retry_after: delay}} ->
    Process.sleep(delay)
    # retry
  {:error, %InferaDB.Error{kind: kind, request_id: id}} ->
    Logger.error("Authorization error: kind=#{kind} request_id=#{id}")
end
```

Error kinds: `:unauthorized`, `:forbidden`, `:not_found`, `:rate_limited`, `:schema_violation`, `:unavailable`, `:timeout`, `:invalid_argument`.

## Framework Integrations

### Phoenix Plug

```elixir
# lib/my_app_web/plugs/inferadb_authorize.ex
defmodule MyAppWeb.Plugs.InferaDBAuthorize do
  import Plug.Conn

  def init(opts), do: opts

  def call(conn, opts) do
    permission = Keyword.fetch!(opts, :permission)
    resource_fn = Keyword.fetch!(opts, :resource)

    vault = InferaDB.organization(MyApp.InferaDB, "my-org")
           |> InferaDB.vault("production")

    user_id = conn.assigns.current_user.id
    resource = resource_fn.(conn)

    case InferaDB.require(vault, "user:#{user_id}", permission, resource) do
      :ok ->
        conn

      {:error, :access_denied} ->
        conn
        |> put_status(:forbidden)
        |> Phoenix.Controller.json(%{error: "Forbidden"})
        |> halt()
    end
  end
end
```

```elixir
# lib/my_app_web/router.ex
pipeline :authorized_document do
  plug MyAppWeb.Plugs.InferaDBAuthorize,
    permission: "can_view",
    resource: fn conn -> "document:#{conn.params["id"]}" end
end

scope "/documents", MyAppWeb do
  pipe_through [:browser, :authenticated, :authorized_document]
  get "/:id", DocumentController, :show
end
```

### Phoenix LiveView

```elixir
defmodule MyAppWeb.DocumentLive.Show do
  use MyAppWeb, :live_view

  @impl true
  def mount(%{"id" => id}, _session, socket) do
    vault = InferaDB.organization(MyApp.InferaDB, "my-org")
           |> InferaDB.vault("production")

    user_id = socket.assigns.current_user.id

    case InferaDB.require(vault, "user:#{user_id}", "can_view", "document:#{id}") do
      :ok ->
        {:ok, assign(socket, :document, Documents.get!(id))}

      {:error, :access_denied} ->
        {:ok, socket |> put_flash(:error, "Not authorized") |> redirect(to: ~p"/")}
    end
  end
end
```
