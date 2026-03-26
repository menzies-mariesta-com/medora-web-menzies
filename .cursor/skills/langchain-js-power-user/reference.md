## LangChain.js power-user reference

This file is optional reading. Use it when you need deeper guidance beyond `SKILL.md`.

### Preferred architecture patterns

- **Prefer “router + chains + tools” over full agents** when the task is well-defined.
  - Router: classify intent (e.g. “answer question”, “search docs”, “call tool”).
  - Chain: deterministic steps (retrieve -> synthesize -> structure).
  - Tools: isolated side effects (DB, HTTP, filesystem, internal APIs).

- **Use an agent only when**:
  - The tool sequence is not known upfront, or
  - The user expects interactive exploration, or
  - You need adaptive tool selection across diverse tasks.

### RAG playbook

#### Data ingestion

- Decide what “document” means (web pages, PDFs, DB rows, markdown).
- Store provenance metadata (source URL/path, title, section, updatedAt).
- Chunking:
  - Use semantic-ish chunking for prose (headings/paragraphs).
  - Use smaller chunks for FAQs and larger chunks for policies.
  - Keep overlap intentional; avoid huge overlaps that duplicate tokens.

#### Retrieval strategy

- Start with simple similarity top-k.
- Add **MMR** when results are redundant.
- Add metadata filters (product, tenant, locale, access control).
- Add hybrid retrieval (BM25 + vectors) if users search by exact terms.

#### Prompting and context control

- Keep a strict context budget (cap chunks by tokens, not count).
- Prefer “answer only from context” modes when correctness is critical.
- Handle empty/low-quality retrieval with:
  - a clarification question, or
  - a fallback “I don’t have enough context” response, or
  - a secondary retrieval pass with query rewriting.

#### Debugging RAG failures

- Log: user query, rewritten query (if any), retrieved doc IDs, scores, and final context size.
- If hallucinations persist:
  - tighten instructions,
  - reduce context to the most relevant chunks,
  - require citations to doc IDs/sections,
  - or switch to structured extraction + render to text.

### Tools and safety

- **Tool schema**: validate all tool inputs with Zod before running the tool.
- **Tool output validation**: validate outputs too (especially if tools call external services).
- **Timeouts**: set a per-tool timeout and return a safe error to the model.
- **Side effects**: make destructive tools require explicit confirmation fields (e.g. `confirm: true`).
- **Least privilege**: only expose tools needed for the current route/task.

### Agents guardrails

- **Limit iterations**: max steps, max tool calls, max tokens.
- **Constrain tools**: fewer tools, clearer names, tighter descriptions.
- **Prevent loops**:
  - detect repeated tool calls with same args,
  - add a “give up / ask for clarification” rule.
- **Prefer structured intermediate state**: make the agent emit structured “plan/state” if debugging.

### Structured output (Zod) recovery

When parsing fails:

- Use `safeParse` and capture the error.
- Retry once with:
  - stricter instructions (“Return ONLY JSON. No markdown.”),
  - smaller schema (remove optional bells/whistles),
  - and include the Zod error summary to guide correction (if safe).
- If still failing, fall back to a simpler schema or a manual extraction pass.

### SvelteKit boundary (server-first)

- Place provider keys and LangChain clients in server-only modules.
- Expose minimal endpoints:
  - **non-streaming**: return JSON (good for structured output).
  - **streaming**: SSE for chat UX; include event types (`token`, `data`, `error`, `done`).
- Ensure `AbortController` cancellation from the client stops the model call.

### Evals and observability (when building an app)

- Add tracing early so you can debug real runs (prompt, retrieved docs, tool calls, latency).
- Start evals small:
  - 10–30 representative examples,
  - a few assertions (schema validity, required fields, no tool misuse),
  - and a regression routine you can run before shipping prompt changes.

### Quick decision table

| Problem                          | Prefer                             |
| -------------------------------- | ---------------------------------- |
| “Answer using my docs”           | RAG chain + structured output      |
| “Call these APIs to do X”        | tools + router + chain             |
| “Unknown multi-step exploration” | agent with strict guardrails       |
| “UI chat experience”             | server streaming (SSE) + trace     |
| “Needs JSON for app state”       | structured output + Zod validation |
