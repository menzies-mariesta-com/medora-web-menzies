---
name: drizzle-docs
description: Uses the full Drizzle ORM documentation (not just the "get started" page) across fundamentals, schema/relations, queries, migrations, validations, performance, and advanced topics. Use when implementing, debugging, or expanding Drizzle ORM code, models, or migrations, or when the user requests support for a specific Drizzle feature.
---

# Drizzle Docs Mastery

## Goal

Implement Drizzle ORM solutions by reading the relevant parts of the Drizzle docs _as a set_ (category coverage + cross-checking), so the result matches current best practices and works end-to-end.

## Core rule: "Not just one page"

When using the docs to solve a task:

1. Start with the Drizzle docs landing page or the most relevant category entry point (for orientation).
2. Then read the additional pages needed to connect the full workflow for that feature (example: Schema -> Relations -> Querying -> Migrations).
3. Do not rely on a single doc page if adjacent topics exist in the same category.
4. After implementation, re-check the docs for "gotchas" or "migrations/transactions/performance" sections when applicable.

## Feature-first workflow

### 1. Identify what Drizzle capability is needed

Classify the request into one or more of these buckets:

- Connect: database client setup / driver specifics
- Schema: tables, columns, types, constraints, indexes, views/schemas
- Relations: one-to-one, one-to-many, many-to-many, relation querying patterns
- Query Data: select/insert/update/delete, filters, joins, ordering, pagination
- Migrations: generating/applying schema changes safely and correctly
- Seeding: seed data patterns and versioning considerations
- Validations: integrating validators (commonly Zod) with Drizzle flows
- Performance: query best practices, indexes, serverless constraints
- Advanced: transactions, batch ops, caching, read replicas, custom types, dynamic queries
- Extensions: any Drizzle add-ons mentioned in the docs

If multiple buckets apply, solve them in dependency order:
`Connect -> Schema -> Relations (if needed) -> Query Data -> Migrations/Seeding (if needed) -> Validations (if used) -> Performance/Advanced (if relevant)`

### 2. Pick the correct dialect/driver scope

Determine which database dialect the code must target (e.g. PostgreSQL, MySQL, SQLite).
Use the docs pages for that dialect when there are dialect-specific differences.

### 3. Doc traversal (category coverage loop)

For each bucket you identified in Step 1:

1. Open the category entry point (e.g. "Fundamentals", "Migrations", "Validations", "Performance", "Advanced").
2. Within that bucket, read all pages that are directly required to implement the feature end-to-end.
3. Cross-check that the types and APIs match what the docs recommend for that bucket.

### 4. Implement with doc-consistent structure

When writing code:

- Use the same exported objects and patterns shown in the docs for the chosen dialect and bucket.
- Keep the structure aligned: schema definitions should live near other schema code, and query functions should import those definitions.
- Prefer documented relation helpers/patterns over manual joins when relations are requested.

### 5. Migrations/changes checklist

When schema changes are involved:

- Follow the docs for migrations workflow.
- Ensure the code changes are compatible with the migration strategy (e.g. column renames, new constraints, indexes).
- If transactions are relevant to migrations, follow the documented approach.

### 6. Validations checklist (when user mentions validation)

If the user asks for request/response validation or runtime checking:

- Use the docs section for validations and implement using the recommended integration pattern (commonly Zod).
- Ensure validated types flow into Drizzle query inputs/outputs as expected.

### 7. Performance/advanced checklist (when relevant)

If the request includes scale, latency, serverless, or "make it faster", consult:

- Indexing and query best practices
- Any caching/dynamic-query guidance
- Transaction/batch guidance

### 8. Verification and "gotchas"

Before finalizing:

- Re-check the most relevant "gotchas" or troubleshooting notes in the same buckets.
- Confirm the solution compiles (TypeScript) and matches the doc’s expected call shapes.

## Output format expectations

- Provide the implemented code change (or a patch-style suggestion) that follows the docs patterns.
- Briefly state which doc buckets/pages you used (at bucket-level; avoid claiming you read every single page on the site).
- Include at least one verification step (e.g. TypeScript check, running migrations, or a small query sanity test), based on the change type.

## Examples (how the agent should behave)

### Example A: "Create tables, relations, and queries"

- Read: Schema + Relations + Query Data (and Migrations if asked for schema evolution).
- Do not stop at "get started"; cross-check how relations are declared and how joined queries are typed.

### Example B: "Add a new column and update queries"

- Read: Schema (for column definition), Query Data (for using the new field), and Migrations (for the change path).
- If validation is mentioned, also consult Validations and ensure input parsing matches the new column type.

### Example C: "Optimize a slow query"

- Read: Performance bucket first, then Query Data + any Advanced bucket items (transactions/batching/caching) that apply.
- Ensure indexes/filters align with the docs recommendations for the chosen dialect.
