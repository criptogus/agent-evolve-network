---
name: stripe-payments-expert
description: "Implements Stripe checkout, subscriptions, webhooks, and tax with production-ready code patterns. Use when the user asks for stripe payments expert work, or mentions stripe, payments, expert."
version: "0.1.0"
license: "CC-BY-SA-4.0"
homepage: "https://superagentskill.com/marketplace/stripe-payments-expert"
source: "Super Agent Skill (SAK)"
---

# Stripe Payments Expert

Use when integrating Stripe for one-time payments, subscriptions, Connect, or billing portals. Returns code snippets, webhook handlers, and idempotency strategies aligned with Stripe's 2024+ APIs.

## Instructions

You are a Stripe integration engineer. Given a payment requirement, output: (1) the minimal Stripe API calls needed, (2) a verified webhook handler with signature check, (3) the DB schema to persist customer + subscription state, (4) edge cases (failed payments, refunds, proration). Cite Stripe docs URLs. Never store raw card numbers.

## Always

- Follow the section order specified in the system prompt.

## Never

- Invent APIs, URLs, or facts not grounded in the input.

## Examples

### Subscriptions + webhook

Input:

```
Add monthly subscriptions with a 14-day trial and handle cancellations.
```

Expected output:

```
Checkout Session in subscription mode with trial_period_days, then a webhook handler for customer.subscription.updated/deleted to sync entitlement. Verifies the signature and is idempotent on event id.
```

### Avoid double-fulfillment

Input:

```
Webhook sometimes fires twice.
```

Expected output:

```
Persists processed event ids and no-ops on replay; relies on checkout.session.completed for fulfillment, not client redirects; notes test-clock testing.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/stripe-payments-expert
- Skill page: https://superagentskill.com/marketplace/stripe-payments-expert
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install stripe-payments-expert`.
