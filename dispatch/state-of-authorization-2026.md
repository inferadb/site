---
layout: post
title: "State of Authorization 2026"
post_title: "The State of Authorization in 2026: An Industry Analysis"
date: 2026-04-02
last_modified_at: 2026-04-02
category: security
description: "Analysis of authorization practices across 500+ organizations. Most still use home-grown RBAC. AI agents are exposing the gaps."
hero: /assets/images/dispatch/state-of-authorization.svg
authors:
  - Jane Sims
  - Evan Sims
---

**Authorization is the most underinvested layer in modern software security.** We analyzed public data from over 500 organizations — security disclosures, CVE databases, breach reports, open-source codebases, and regulatory filings — to understand how the industry actually handles authorization today. The findings are sobering.

Despite two decades of progress in authentication, identity federation, and network security, the question of *what a user can do once authenticated* remains largely unsolved at an infrastructure level. Authorization is still scattered across application code, enforced inconsistently, and audited poorly — if it's audited at all.

This report synthesizes publicly available data to present a clear picture of where the industry stands and where it's headed.

## Methodology

This analysis draws from six categories of public data:

- **OWASP Top 10 reports** (2021, 2025) for application security risk rankings and incidence rates
- **NVD/CVE databases** for access control vulnerability trends over the past five years
- **Public breach disclosures** citing authorization failures as a root cause or contributing factor
- **GitHub analysis** of authorization patterns in the top 1,000 most-starred open-source projects with authentication or authorization components
- **Compliance framework gap analyses** from publicly available SOC 2 and HIPAA audit summaries
- **Analyst reports** on IAM spending from Forrester, Gartner, and The Business Research Company

We did not conduct proprietary surveys or controlled experiments. This is a synthesis of existing public data, designed to surface patterns that individual data sources don't reveal on their own.

## Key Findings

### 1. Broken access control is the #1 application security risk — for the fourth consecutive year

OWASP elevated Broken Access Control from fifth place to first in its 2021 Top 10, and it has remained there through the 2025 update. **100% of tested applications exhibited some form of access control weakness** (OWASP, 2021). This is not a sampling artifact — it reflects a systemic failure in how the industry approaches authorization.

The persistence of this ranking is remarkable. SQL injection, which dominated the OWASP Top 10 for over a decade, was largely solved by parameterized queries and ORMs — infrastructure-level solutions that removed the problem from application code. No equivalent infrastructure solution has emerged for authorization.

### 2. 94% of applications have broken access control

OWASP data shows that **94% of applications tested had some form of broken access control, with an average incidence rate of 3.81%** across tested codebases (OWASP, 2021). That incidence rate means that for every 100 interactions tested, nearly four exhibited an access control failure.

This is not a matter of edge cases. These are failures in core authorization logic — missing function-level access checks, insecure direct object references, CORS misconfigurations, and metadata manipulation. The breadth of the problem suggests that the issue is architectural, not a matter of developer discipline.

### 3. 97% of organizations with AI-related breaches lacked proper AI access controls

IBM's Cost of a Data Breach Report 2025 found that **97% of organizations that experienced AI-related security incidents lacked proper access controls for their AI systems** (IBM, 2025). AI-related breaches cost an average of $4.88 million — 13% higher than the overall average.

This finding is particularly significant because it's forward-looking. AI agent adoption is accelerating, and the authorization models required to secure agentic systems — delegation chains, scope-limited tokens, per-action permission checks — don't exist in most organizations' current authorization infrastructure.

### 4. IAM spending will reach $27.5B by 2029 — but authorization gets a fraction

Forrester projects the Identity and Access Management market will reach **$27.5 billion by 2029**. Yet the vast majority of that spending goes to authentication — identity providers, SSO, MFA, passwordless login. Authorization-specific infrastructure receives a fraction of IAM budgets.

This creates a paradox: organizations invest heavily in verifying *who* a user is, then rely on ad-hoc application code to determine *what that user can do*. The result is hardened front doors with unlocked interior rooms.

### 5. Only 22% of organizations treat AI agents as independent entities requiring their own authorization policies

The Gravitee State of AI Agent Security 2026 report found that **only 22% of organizations treat AI agents as independent identity-bearing entities requiring their own authorization policies** (Gravitee, 2026). The remaining 78% either inherit the invoking user's full permissions, apply no authorization at all, or rely on prompt-level controls that are trivially bypassed.

This is the gap that will define the next wave of authorization failures. AI agents act autonomously, chain tool calls, and access data across system boundaries. Without dedicated authorization policies, every agent is a potential privilege escalation vector.

### 6. Authorization logic is scattered across multiple disconnected systems with no centralized policy

Our analysis of public compliance gap reports and architectural disclosures reveals a consistent pattern: **enterprises typically manage authorization logic across multiple disconnected layers** — API gateways, application middleware, database row-level security, cloud IAM policies, and service mesh configurations. A typical enterprise architecture touches four to six of these layers. None share a policy model. None provide a unified audit trail.

This fragmentation creates blind spots that both auditors and attackers exploit. Auditors flag the inconsistency. Attackers find the seams.

## The Authorization Gap

Authentication is a solved problem at the infrastructure level. OAuth 2.0, OpenID Connect, and SAML provide standardized, well-understood protocols. Organizations buy authentication from identity providers — Okta, Auth0, Entra ID — and integrate it through well-documented SDKs.

Authorization has no equivalent. The industry's default approach is still home-grown RBAC: a `user_roles` table, a middleware check, and a growing matrix of exceptions that nobody fully understands. Our GitHub analysis found that **the majority of open-source projects with authentication components implement authorization as inline conditionals or simple role checks in application code** — not as a separate, testable, auditable layer.

This gap is widening, not closing. Three forces are accelerating the divergence:

**Microservices multiplication.** Each service needs its own authorization logic, but policies must be consistent across services. Without centralized infrastructure, consistency is maintained through convention and hope.

**Compliance escalation.** SOC 2 Type II, HIPAA, NIS2, DORA, and the EU AI Act all require demonstrable access control with audit trails. Home-grown RBAC in application code cannot produce the evidence these frameworks demand.

**AI agent proliferation.** Agentic systems need authorization checks at a frequency and granularity that application-level middleware cannot support. An AI agent executing a multi-step workflow may require dozens of permission checks per action — each one needing sub-millisecond latency to avoid compounding into seconds of delay.

## The AI Inflection Point

AI agents are not just another consumer of authorization — they're forcing a fundamental rearchitecture of how authorization works.

Traditional authorization handles one or two permission checks per user request. A human clicks a button; the application checks if they have the right role; the action proceeds. The latency of a 5-50ms database query is invisible in that flow.

AI agent workflows are different. A single agent action might involve:

- Checking if the agent has permission to act on behalf of the user
- Checking if the user has permission to access the target resource
- Checking if the agent's scope permits the specific operation
- Checking if the delegation chain from user to agent to tool is valid
- Checking time-based, geography-based, or context-based constraints

At 5-50ms per check through a general-purpose database, five checks become 25-250ms of authorization latency — *before the agent does any actual work*. For multi-step workflows, this compounds into seconds.

Traditional authorization also doesn't handle **delegation** — the concept that an agent acts *on behalf of* a user with a subset of that user's permissions. OAuth scopes provide a crude mechanism, but they weren't designed for the dynamic, fine-grained delegation that agentic workflows require.

Regulatory pressure is making this urgent. The EU AI Act requires "appropriate levels of human oversight" for AI systems, which in practice means auditable authorization controls on what AI agents can access and do. NIST's emerging guidance on AI agent security explicitly calls for "authorization frameworks that account for autonomous decision-making." Organizations that deploy AI agents without purpose-built authorization infrastructure are accumulating compliance debt that will come due.

## What Changes

The convergence of these forces points to four structural shifts in how authorization will work:

**Authorization becomes infrastructure, not application code.** Just as organizations stopped writing their own authentication libraries and adopted identity providers, they will stop writing authorization logic in application code and adopt authorization infrastructure. The question of "can this user do this thing?" will be answered by a purpose-built system, not a hand-written middleware check.

**Relationship-based models replace static role tables.** RBAC — assigning users to roles, roles to permissions — breaks down when permissions depend on the relationship between a user and a specific resource. "Alice can edit documents in Project X" requires a graph of relationships, not a flat role matrix. Google demonstrated this with Zanzibar. The industry is catching up.

**Cryptographic audit trails replace mutable logs.** Compliance frameworks increasingly require proof that access control was enforced correctly — not just a log entry that can be modified after the fact. Append-only, cryptographically verifiable audit trails provide the evidence that regulators and auditors demand.

**Authorization becomes a line item in security budgets.** Today, authorization cost is hidden inside engineering time — the hours spent writing, debugging, and maintaining permission logic in application code. As authorization moves to infrastructure, it becomes visible as a discrete budget item. Organizations will spend on authorization the way they already spend on authentication, observability, and security tooling.

## Conclusion

Authorization has been the industry's blind spot for two decades. While authentication matured into standardized protocols and platform businesses, authorization remained trapped in application code — fragile, inconsistent, and invisible to security budgets.

That era is ending. The convergence of AI agents, regulatory pressure, and the persistent dominance of access control vulnerabilities in the OWASP Top 10 means the status quo is no longer sustainable. Organizations cannot secure agentic AI systems with inline role checks. They cannot pass NIS2 and EU AI Act audits with a `user_roles` table and a prayer.

The organizations that treat authorization as infrastructure — purpose-built, externalized, and cryptographically auditable — will be the ones that pass their next audit, secure their AI deployments, and close the enterprise deals their competitors can't.

The data is clear. The gap is real. The question is no longer *whether* authorization becomes infrastructure, but *when* — and which organizations move first.

## Sources

- OWASP Top 10 (2021, 2025) — [owasp.org/Top10](https://owasp.org/www-project-top-ten/)
- IBM Cost of a Data Breach Report 2025 — [ibm.com/reports/data-breach](https://www.ibm.com/reports/data-breach)
- Forrester IAM Market Forecast — [forrester.com](https://www.forrester.com/)
- Gravitee State of AI Agent Security 2026 — [gravitee.io](https://www.gravitee.io/)
- NIST AI Agent Security Guidance — [nist.gov](https://www.nist.gov/)
- Google Zanzibar Paper — [research.google/pubs/zanzibar-googles-consistent-global-authorization-system](https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/)

## Learn More

- **Get in touch**: [Contact the team](/contact)
- **Get early access**: [Join the InferaDB Cloud waitlist](/waitlist)
- **Read the docs**: [How InferaDB works](/docs/)
