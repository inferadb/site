---
layout: post
title: "MCP Needs Authorization"
post_title: "Why the Model Context Protocol Needs an Authorization Layer"
date: 2026-04-02
category: ai
description: "MCP connects AI agents to tools and data sources but has no built-in authorization. Every tool call is a trust boundary crossing without access control."
hero: /assets/images/dispatch/mcp-authorization.svg
authors:
  - Evan Sims
---

**The Model Context Protocol knows who connects. It does not know what they should be allowed to do.** MCP includes OAuth 2.1 for transport-level authentication — verifying the identity of the connecting client. But once connected, every tool on the server is accessible. There is no fine-grained authorization: no per-tool permissions, no per-resource checks, no delegation chain verification.

MCP is rapidly becoming the standard interface between AI agents and the tools they operate. Anthropic, OpenAI, Google, and dozens of framework authors have adopted it. The protocol handles tool discovery, capability negotiation, transport, and client authentication. It does not handle the question that matters most in production: is this specific user, through this specific agent, authorized to invoke this specific tool on this specific resource?

## What MCP Gets Right

Credit where it's due. MCP solves a real problem well.

Before MCP, every agent framework implemented its own tool-calling interface. Tools written for LangChain didn't work with AutoGen. A Semantic Kernel plugin required a different integration than a CrewAI tool. The result was fragmentation — tool authors maintaining multiple integrations, agent developers locked into framework-specific ecosystems.

MCP standardizes this with a clean design:

- **A uniform interface** for tool discovery and invocation across any agent framework
- **Capability negotiation** so agents can discover what tools are available and what parameters they accept
- **Transport-agnostic architecture** that works over stdio, HTTP, and WebSocket
- **Structured I/O** with typed schemas for tool inputs and outputs
- **OAuth 2.1 transport authentication** with PKCE, dynamic client registration, and token handling for HTTP-based transports

This is genuinely valuable. A single protocol for agent-tool communication eliminates an entire class of integration problems, and the OAuth 2.1 layer ensures that connections themselves are authenticated. MCP earned its adoption.

The problem is what the protocol leaves out — not authentication (who is connecting), but authorization (what they can do once connected).

## Where MCP's Authorization Falls Short

MCP's OAuth 2.1 layer authenticates the connection. It does not authorize individual actions. The gap between "this client is allowed to connect" and "this user is allowed to invoke this tool on this resource" is where the security problems live.

**No fine-grained, per-tool authorization.** OAuth scopes can restrict broad categories of access, but MCP doesn't define tool-level scopes. When an agent connects to an MCP server, it can invoke any tool that server exposes. There's no mechanism in the protocol to say "this user can access the search tool but not the delete tool."

**Tool calls execute with the server's permissions, not the user's.** An MCP server runs with its own service account credentials — database access, API keys, file system permissions. OAuth verifies who connected, but the tool executes with the server's full privilege set regardless of what the requesting user is actually authorized to do. The user's permission boundary is invisible to the tool.

**No delegation chain verification.** When Agent A calls Tool B on behalf of User C, MCP's OAuth token identifies the client connection. It doesn't track the delegation chain — whether User C authorized Agent A to act on their behalf, whether that delegation is still valid, or whether it's scoped to this type of action.

**No per-resource authorization.** Access to a tool doesn't mean access to every resource that tool can reach. An agent with permission to invoke a document search tool should still be restricted to documents the requesting user can see. MCP has no mechanism for this — the tool's database credentials determine access, not the user's authorization level.

**No authorization audit trail.** MCP can log that a tool was called. It cannot log why the call was permitted, who authorized it, or what authorization policy was evaluated. In regulated environments, this distinction is the difference between compliance and a finding.

## The Attack Surface

These aren't theoretical gaps. They map to concrete attack vectors that emerge the moment MCP is deployed in a multi-user, multi-tenant environment.

**Privilege escalation through tool chaining.** An agent uses a discovery tool to enumerate available resources, then invokes a management tool against resources the user shouldn't see. The MCP server has access to both tools. The agent has access to the MCP server. Therefore the agent has access to everything — the user's actual permissions never enter the equation.

**Cross-tenant data access.** An MCP data source tool queries a shared database. Agent A, acting on behalf of a user in Tenant X, retrieves records belonging to Tenant Y. The tool executed successfully because the MCP server's database credentials have cross-tenant access. Nothing in the protocol enforced tenant boundaries at the request level.

**Scope creep.** A user approves an agent to search their documents. The agent's MCP connection also exposes a write tool on the same server. The agent decides — based on its prompt, its model's reasoning, or a prompt injection — to modify a document. The user never authorized writes. MCP never checked.

**Consent degradation.** A user grants an agent permission to perform Task X. Over the course of a session, the agent's behavior evolves — new tools are discovered, new capabilities are chained together. The agent is now performing Task Y using the same MCP connection that was approved for Task X. The user's original consent has degraded into a blanket authorization they never intended.

## What Authorization for MCP Looks Like

Securing MCP tool invocations requires answering a four-part question on every call: **can this user, through this agent, invoke this tool, on this resource?**

Each component matters:

- **This user** — the check must happen at the invoking user's permission level, not the agent's service account. The user's organizational role, team membership, and resource-specific grants determine access.
- **Through this agent** — the delegation chain must be verified. Did this user authorize this agent to act on their behalf? Is that authorization still valid? Is it scoped to this type of action?
- **This tool** — tool-level permissions must be granular. Read access to a data source doesn't imply write access. Search access doesn't imply delete access.
- **On this resource** — the target resource must be authorized independently. Access to a tool doesn't mean access to every resource that tool can reach.

These checks must be **per-session, not per-connection**. A long-lived MCP connection should not carry forward permissions that were granted for a specific task. Sessions expire. Delegations have scope. Authorization state changes.

And every decision must be **auditable** — not just logged, but traceable through the full delegation chain from user to agent to tool to resource.

## How InferaDB Addresses This

InferaDB's relationship-based authorization model maps directly to the agent-tool delegation problem. The schema is straightforward in IPL:

```
type user {}

type agent {
    relation owner: user
    relation delegated_user: user
}

type tool_server {
    relation admin: user
}

type tool {
    relation server: tool_server
    relation can_invoke = delegated_user from agent & viewer from server

    relation viewer: user | agent
}

type resource {
    relation tool: tool
    relation authorized_user: user

    relation can_access = authorized_user & can_invoke from tool
}
```

The `can_invoke` relation on `tool` computes access by intersecting two conditions: the agent must have a delegation from the user (`delegated_user from agent`), and the user must have access to the tool's server (`viewer from server`). The `can_access` relation on `resource` further intersects: the user must be authorized for the specific resource, and the tool invocation must itself be permitted.

A permission check becomes a single API call:

```
POST /v1/check
{
  "subject": "user:alice",
  "action": "can_access",
  "resource": "resource:quarterly-report",
  "context": {
    "agent": "agent:data-assistant",
    "tool": "tool:document-search"
  }
}
```

InferaDB evaluates this in **2.8 microseconds** — fast enough to check every tool invocation in an agent workflow without measurable latency impact. The delegation chain is modeled as relationships, not buried in application code. Revoking a user's delegation to an agent immediately invalidates all downstream tool access. No cache to expire. No eventual consistency window.

Every check produces an auditable record: who requested access, through which agent, to which tool, on which resource, which policy matched, and whether access was granted or denied. The full chain, cryptographically signed.

## Authorization Is Infrastructure

MCP is the right protocol for agent-tool communication. It is the wrong place to solve authorization.

Embedding authorization logic in MCP servers means every server implements its own access control — differently, inconsistently, with varying levels of rigor. This is the same anti-pattern that plagued web applications for two decades before authorization moved out of application code and into infrastructure.

Authorization needs to be **purpose-built** — a dedicated system with a formal policy language, not ad-hoc checks scattered across tool implementations. It needs to be **independently verifiable** — auditors should be able to inspect authorization decisions without trusting the tool's implementation. And it needs to be **enforced at the speed agents operate** — microseconds, not milliseconds, because agents don't wait.

The MCP ecosystem is growing fast. The authorization gap is growing with it. Every new MCP server deployed without per-user, per-tool authorization is another attack surface in production.

**[Start with InferaDB's quickstart guide](/docs/quickstart)** or **[join the waitlist](/waitlist)** for managed cloud.
