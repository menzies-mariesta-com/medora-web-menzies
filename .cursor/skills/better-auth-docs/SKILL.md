---
name: better-auth-docs
description: Locates the most relevant Better Auth documentation pages by feature category and provides a complete local index of docs URLs. Use when the user asks for Better Auth documentation links, page lookup, or guidance on where to read next in the Better Auth docs.
---

# Better Auth Docs

## What this skill helps with

- Choose the correct Better Auth docs section (installation, core concepts, plugins, adapters, integrations, infrastructure, guides, examples, reference).
- Provide a link to the exact docs page(s) the user should read.
- When asked for "all pages", return (or link to) the complete URL index in `reference.md`.

## Quick lookup workflow

1. Identify the intent:
   - "How do I install / configure?" -> `installation`
   - "Core ideas / terms" -> `concepts/*`
   - "Auth method like 2FA, magic link, passkey" -> `plugins/*`
   - "Database/ORM adapter" -> `adapters/*`
   - "Framework integration (Next, SvelteKit, Express, etc.)" -> `integrations/*`
   - "Dash/sentinel/audit logs/infra setup" -> `infrastructure/*`
   - "Migration steps" -> `guides/*`
   - "Examples" -> `examples/*`
   - "Options, errors, FAQ, security details" -> `reference/*`
2. If you need a complete list of pages, use `reference.md`.
3. If the user's question is specific but you're unsure which bucket it belongs to, pick 1-3 candidate pages (using the keyword mapping above) and ask which area they care about most.

## URL index source

This skill's `reference.md` is generated from Better Auth's docs MDX files in the `better-auth/better-auth` GitHub repository under `docs/content/docs/`, mapped to the public routes under `https://better-auth.com/docs/`.

## Example outputs

- "Where do I read about configuring email/password?" -> `https://better-auth.com/docs/authentication/email-password`
- "Show me all Better Auth docs pages." -> return the contents of `reference.md`
