---
layout: post
title: "NIS2, DORA, and the EU AI Act: Why Authorization Is Now a Compliance Requirement — InferaDB"
post_title: "NIS2, DORA, and the EU AI Act: Why Authorization Is Now a Compliance Requirement"
date: 2026-02-15
category: security
description: "Three EU regulations now mandate fine-grained auditable access control. Here's what NIS2, DORA, and the EU AI Act mean for your authorization stack."
authors:
  - Jane Sims
---

**Authorization is no longer a best practice. In the EU, it's the law.**

Three major regulations — NIS2, DORA, and the EU AI Act — have converged on the same technical requirement: organizations must implement fine-grained, auditable access control. Not as a recommendation. As a legal obligation, with supervisory authorities, enforcement mechanisms, and penalties that scale with revenue.

If you operate in the EU or serve EU customers — which includes most global technology companies — this affects you directly.

## NIS2: Zero-Trust Across 18 Sectors

The Network and Information Systems Directive 2 became effective in **October 2024**. It's the broadest cybersecurity regulation the EU has ever enacted.

**Scope:** 18 critical and important sectors — energy, transport, health, digital infrastructure, ICT service management, and more. An estimated **160,000+ entities** fall under its requirements.

**What it mandates for authorization:**

- **Access control policies** and human resource security procedures
- **Cryptography and encryption** policies for data protection
- **Zero-trust principles** — every access request must be verified against policy, regardless of network location or prior authentication

Zero-trust is not a marketing term here. It's a regulatory requirement. And zero-trust fundamentally requires fine-grained authorization: you can't verify every request if your permission model is a flat role table checked at the API gateway.

**Penalties:** Up to **10 million euros or 2% of global annual turnover**, whichever is higher.

## DORA: Least-Privilege for Financial Services

The Digital Operational Resilience Act became effective in **January 2025**, targeting the financial sector specifically.

DORA requires financial entities to implement ICT security policies ensuring access to systems and data is limited to **"legitimate and approved functions only."** That's a direct mandate for least-privilege access control — not role-based approximations, but function-level precision.

**DORA goes further than NIS2 in three ways:**

1. **Access policies must be documented and regularly reviewed** — not just implemented, but provably maintained
2. **Comprehensive logging of access events** is mandatory — you must demonstrate to supervisors that your controls actually work
3. **The mandate extends to ICT service providers** — if you provide infrastructure to financial institutions, you inherit their compliance obligations

That last point is critical. **Any technology company serving the financial sector now needs auditable authorization infrastructure** as a condition of doing business. This isn't optional. It's a procurement requirement.

## EU AI Act: Authorization for AI Systems

The EU AI Act introduces something entirely new: **authorization requirements for artificial intelligence.**

The high-risk provisions take effect between **August 2026 and 2027**. For AI systems that make or influence consequential decisions — hiring, lending, law enforcement, critical infrastructure — the requirements are concrete:

- **Human oversight mechanisms** that allow operators to understand and intervene in AI behavior
- **Logging of all inputs and outputs** for high-risk AI systems
- **Access controls** limiting who can deploy, configure, and modify AI systems
- **Audit trails** demonstrating compliance over time

AI agents that access enterprise data and invoke tools on behalf of users are **squarely within scope** when their actions have material consequences. If your AI system can approve a loan, flag a candidate, or modify critical infrastructure, the EU AI Act requires you to prove who authorized it to do so and under what constraints.

This is where most existing authorization systems fall short. They were designed for human users making synchronous requests — not autonomous agents making chains of decisions at machine speed.

## The Convergence: What All Three Regulations Demand

Strip away the legal language and these three regulations converge on the same technical requirements:

| Requirement | NIS2 | DORA | EU AI Act |
|-------------|------|------|-----------|
| Fine-grained access control | Yes | Yes | Yes |
| Auditable access logs | Yes | Yes | Yes |
| Tamper-evident audit trails | Implied | Yes | Yes |
| Documented access policies | Yes | Yes | Yes |
| Cryptographic data protection | Yes | Yes | Implied |
| Regular review and testing | Yes | Yes | Yes |

The pattern is clear. **Fine-grained, auditable, tamper-evident access control is now a baseline regulatory expectation across the EU.**

And enforcement has teeth. Between NIS2's revenue-based fines, DORA's supervisory authorities, and the EU AI Act's market access restrictions, non-compliance carries real consequences.

## Why Traditional Authorization Falls Short

Most authorization systems can check permissions. Few can prove they did.

Traditional approaches — role checks in application code, policy engines backed by general-purpose databases — can implement access control. But they can't produce the cryptographic proof that regulators increasingly demand.

**Append-only logs in a relational database aren't tamper-evident.** A database administrator can alter records. An attacker with write access can cover their tracks. When a regulator asks you to prove that an access log hasn't been modified, "trust us, it's append-only" is not a satisfying answer.

DORA explicitly requires demonstrating to supervisors that controls function as intended. The EU AI Act requires audit trails for high-risk systems. NIS2 mandates cryptographic protections. Collectively, they're asking for something stronger than traditional logging.

## How InferaDB Addresses This by Design

InferaDB wasn't designed to meet these regulations specifically — it was designed around the principle that authorization decisions should be cryptographically verifiable. The regulatory alignment is a natural consequence.

**Merkle proof audit trails.** Every authorization decision is recorded in a per-vault blockchain. Auditors can verify mathematically that the log hasn't been tampered with — no trust required. This satisfies DORA's demonstration requirements and NIS2's cryptographic mandates without bolting on a separate compliance layer.

**Per-resource, per-action granularity.** InferaDB's authorization model operates at the fine-grained level that NIS2's zero-trust principles and DORA's least-privilege requirements demand. Not roles. Not coarse groups. Individual resources and actions.

**Per-vault encryption with independent key management.** Each tenant's data is cryptographically isolated with AES-256-GCM envelope encryption. Vaults can be region-pinned for data residency. This simplifies GDPR compliance alongside NIS2 and DORA requirements.

**Linearizable consistency with revision tokens.** Authorization decisions are deterministic and reproducible. When a regulator asks "what would this system have decided at time T?", you can answer precisely. That's essential for the EU AI Act's human oversight requirements.

## The Compliance Clock Is Ticking

NIS2 is already in effect. DORA is already in effect. The EU AI Act's high-risk provisions arrive in 2026-2027.

Organizations that treat authorization as an engineering problem they'll solve later are running out of "later." The regulatory landscape has shifted, and **authorization infrastructure is now a compliance dependency, not just a technical one.**

Building this in-house means maintaining cryptographic audit trails, fine-grained policy enforcement, and tamper-evident logging — indefinitely. Or you can use infrastructure where those properties are built in.

- **See how it works**: [Quickstart Guide](/docs/quickstart)
- **Explore the source**: [InferaDB on GitHub](https://github.com/inferadb/inferadb)
- **Get early access** to InferaDB Cloud: [Join the waitlist](/waitlist)
