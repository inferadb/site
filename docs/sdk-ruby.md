---
layout: docs
title: Ruby SDK — InferaDB
doc_title: Ruby SDK
doc_subtitle: Idiomatic Ruby client for InferaDB with Rails integration.
---

> **Coming soon.** The Ruby SDK is under active development. The API surface shown here is based on the [Rust SDK](/docs/sdk-rust) and may change before release.

The official Ruby SDK (`inferadb`) provides an idiomatic client for InferaDB's authorization APIs. Requires Ruby 3.2+ and works with Rails, Sinatra, and any Rack-based framework.

## Installation

```ruby
gem "inferadb"
```

```bash
bundle install
```

## Authentication

Three authentication methods:

| Method                           | Use Case                     | Security |
| -------------------------------- | ---------------------------- | -------- |
| Client Credentials (Ed25519 JWT) | Service-to-service           | High     |
| Bearer Token                     | User sessions, OAuth         | Medium   |
| API Key                          | Testing, simple integrations | Basic    |

### Client Credentials (Recommended)

```ruby
require "inferadb"

client = InferaDB::Client.new(
  url: "https://engine.inferadb.com",
  credentials: InferaDB::ClientCredentials.new(
    client_id: "my-client",
    private_key: InferaDB::Ed25519PrivateKey.from_pem_file("client.pem"),
    certificate_id: "cert-id"
  )
)
```

### Bearer Token

```ruby
client = InferaDB::Client.new(
  url: "https://engine.inferadb.com",
  token: ENV.fetch("INFERADB_TOKEN")
)
```

### API Key

```ruby
client = InferaDB::Client.new(
  url: "https://engine.inferadb.com",
  api_key: ENV.fetch("INFERADB_API_KEY")
)
```

## Permission Checks

```ruby
vault = client.organization("my-org").vault("production")

# Simple check
allowed = vault.check("user:alice", "can_edit", "document:readme")
```

### With ABAC Context

```ruby
allowed = vault.check("user:alice", "can_view", "document:readme",
  context: { ip_address: "10.0.0.1" }
)
```

### Require — Raises on Deny

```ruby
# Raises InferaDB::AccessDeniedError if permission is denied
vault.require!("user:alice", "can_edit", "document:readme")
```

### With Consistency Token

```ruby
allowed = vault.check("user:alice", "can_view", "document:readme",
  at_least_as_fresh: revision_token
)
```

### Batch Check

```ruby
results = vault.check_batch([
  { subject: "user:alice", permission: "can_edit", resource: "document:readme" },
  { subject: "user:bob", permission: "can_view", resource: "document:readme" },
])

results.all_allowed? # => true/false
```

## Relationships

### Write

```ruby
# Returns a revision token
token = vault.relationships.write(
  resource: "document:readme",
  relation: "editor",
  subject: "user:alice"
)
```

### Batch Write

```ruby
vault.relationships.write_batch([
  { resource: "document:readme", relation: "editor", subject: "user:alice" },
  { resource: "document:readme", relation: "viewer", subject: "user:bob" },
])
```

### List

```ruby
rels = vault.relationships.list(resource: "document:readme")
```

### Delete

```ruby
vault.relationships.delete_where(
  resource: "document:readme",
  relation: "viewer",
  subject: "user:bob"
)
```

## Lookups

```ruby
# What resources can Alice view?
resources = vault.resources
  .accessible_by("user:alice")
  .with_permission("can_view")
  .resource_type("document")
  .to_a

# Who can edit this document?
subjects = vault.subjects
  .with_permission("can_edit")
  .on_resource("document:readme")
  .to_a
```

## Testing

Three approaches with different trade-offs:

### MockClient (Fastest)

```ruby
require "inferadb/testing"

client = InferaDB::Testing::MockClient.new do |mock|
  mock.on_check("user:alice", "can_edit", "document:readme").allow
  mock.on_check("user:bob", "can_edit", "document:readme").deny
  mock.on_check_any_subject("can_view", "document:readme").allow
  mock.default_deny
  mock.verify_on_teardown!
end
```

Calling `verify_on_teardown!` asserts that all registered expectations were invoked when the mock is torn down.

### InMemoryClient (Full Policy Evaluation)

```ruby
require "inferadb/testing"

client = InferaDB::Testing::InMemoryClient.with_schema_and_data(
  schema: <<~IPL,
    type document {
        relation viewer
        relation editor
        relation can_view = viewer | editor
    }
  IPL
  data: [
    { resource: "document:readme", relation: "editor", subject: "user:alice" },
    { resource: "document:readme", relation: "viewer", subject: "user:bob" },
  ]
)
```

### TestVault (Real Instance)

```ruby
require "inferadb/testing"

vault = InferaDB::Testing::TestVault.create(org, schema: schema_ipl)
# vault auto-cleans up when garbage collected
# call vault.preserve! to keep data for debugging
```

### RSpec Integration

```ruby
require "inferadb/testing/rspec"

RSpec.describe "Document authorization" do
  let(:client) do
    InferaDB::Testing::InMemoryClient.with_schema_and_data(
      schema: "...",
      data: [{ resource: "document:readme", relation: "editor", subject: "user:alice" }]
    )
  end

  let(:vault) { client.organization("test").vault("test") }

  it "allows Alice to edit" do
    expect(vault.check("user:alice", "can_edit", "document:readme")).to be true
  end

  it "denies Bob from editing" do
    expect(vault.check("user:bob", "can_edit", "document:readme")).to be false
  end
end
```

### Minitest Integration

```ruby
require "inferadb/testing"

class DocumentAuthorizationTest < Minitest::Test
  def setup
    @client = InferaDB::Testing::InMemoryClient.with_schema_and_data(
      schema: "...",
      data: [{ resource: "document:readme", relation: "editor", subject: "user:alice" }]
    )
    @vault = @client.organization("test").vault("test")
  end

  def test_alice_can_edit
    assert @vault.check("user:alice", "can_edit", "document:readme")
  end
end
```

## Error Handling

```ruby
begin
  vault.require!("user:alice", "can_edit", "document:readme")
rescue InferaDB::AccessDeniedError
  # permission denied
rescue InferaDB::Error => e
  if e.retriable?
    sleep e.retry_after
    retry
  end
  logger.error("Authorization error: kind=#{e.kind} request_id=#{e.request_id}")
end
```

`ErrorKind` values: `:unauthorized`, `:forbidden`, `:not_found`, `:rate_limited`, `:schema_violation`, `:unavailable`, `:timeout`, `:invalid_argument`.

## Framework Integrations

### Rails Controller Concern

```ruby
# app/controllers/concerns/inferadb_authorization.rb
module InferadbAuthorization
  extend ActiveSupport::Concern

  private

  def authorize_inferadb!(permission, resource)
    vault = InferaDB.vault
    vault.require!(
      "user:#{current_user.id}",
      permission,
      resource
    )
  rescue InferaDB::AccessDeniedError
    head :forbidden
  end
end
```

```ruby
# app/controllers/documents_controller.rb
class DocumentsController < ApplicationController
  include InferadbAuthorization

  before_action :set_document

  def show
    authorize_inferadb!("can_view", "document:#{@document.id}")
  end

  def update
    authorize_inferadb!("can_edit", "document:#{@document.id}")
    @document.update!(document_params)
  end

  private

  def set_document
    @document = Document.find(params[:id])
  end
end
```

### Rails Initializer

```ruby
# config/initializers/inferadb.rb
InferaDB.configure do |config|
  config.url = ENV.fetch("INFERADB_URL")
  config.credentials = InferaDB::ClientCredentials.new(
    client_id: ENV.fetch("INFERADB_CLIENT_ID"),
    private_key: InferaDB::Ed25519PrivateKey.from_pem_file(
      ENV.fetch("INFERADB_KEY_PATH")
    ),
    certificate_id: ENV.fetch("INFERADB_CERT_ID")
  )
  config.organization = ENV.fetch("INFERADB_ORG")
  config.vault = ENV.fetch("INFERADB_VAULT")
end
```
