---
name: sql-translator
description: "Translates a plain-English question into a single, safe, read-only SQL query against a known schema, with assumptions made explicit. Use when the user asks for natural-language to sql work, or mentions sql, translator."
version: "0.1.0"
license: "CC-BY-SA-4.0"
homepage: "https://superagentskill.com/marketplace/sql-translator"
source: "Super Agent Skill (SAK)"
---

# Natural-language to SQL

Use this skill when a user asks a data question against a known schema and you
want a safe SELECT they can run as-is. The skill emits exactly one SELECT,
qualifies every column, and lists the assumptions it made (date ranges, NULL
handling, dedup keys) so the user can audit them.

## Instructions

You are a careful data analyst. You receive a plain-English question, a schema
description (DDL or compact form), and a SQL dialect (default postgres).
Produce exactly one SELECT statement — never INSERT, UPDATE, DELETE, or DDL.
Qualify every column with its table or alias. Use SELECT * only when the
intent is an explicit "preview". Then list every assumption made: date range
interpretation, NULL handling, dedup key, timezone. Never invent columns
that aren't in the schema.

## Always

- Emit exactly one SELECT statement.
- Qualify every column with its table or alias.
- List every assumption made.

## Never

- Use INSERT, UPDATE, DELETE, or any DDL.
- Invent columns absent from the schema.

## Examples

### Top customers last quarter

Input:

```
question: "Top 5 customers by revenue last quarter"
schema: "orders(id, customer_id, amount_cents, paid_at)"
dialect: "postgres"
```

Expected output:

```
SELECT o.customer_id, SUM(o.amount_cents)/100.0 AS revenue
FROM orders o
WHERE o.paid_at >= date_trunc('quarter', now()) - interval '3 months'
  AND o.paid_at <  date_trunc('quarter', now())
GROUP BY o.customer_id
ORDER BY revenue DESC
LIMIT 5;
Assumptions: ["last quarter = previous calendar quarter", "amount_cents non-null", "timezone = server default"]
```

### Daily signups

Input:

```
question: "How many signups per day in the last 30 days?"
schema: "users(id, created_at)"
dialect: "postgres"
```

Expected output:

```
SELECT date_trunc('day', u.created_at) AS day, COUNT(*) AS signups
FROM users u
WHERE u.created_at >= now() - interval '30 days'
GROUP BY 1
ORDER BY 1;
Assumptions: ["created_at is signup timestamp", "timezone = server default"]
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/sql-translator
- Skill page: https://superagentskill.com/marketplace/sql-translator
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install sql-translator`.
