---
name: langchain-js-power-user
description: Builds production-ready LangChain.js apps with best-practice patterns for RAG, tools/function calling, agents, memory/chat history, streaming, structured outputs (Zod), and evals/tracing (LangSmith). Use when the user mentions LangChain.js/LangChain JS/langchain, RAG, embeddings, vector store, retriever, tools, agents, LangSmith, structured output, or “build an LLM app”.
---

# LangChain.js Power User

## Goal

Implement end-to-end LangChain.js solutions (Node.js + SvelteKit-friendly) that are reliable, observable, and easy to iterate on: RAG + tools + agents + memory + structured output + evals.

## Defaults (unless the user specifies otherwise)

- Prefer provider-agnostic code paths when possible (OpenAI/Anthropic/Gemini/Azure/Ollama).
- Prefer explicit, composable primitives (runnables/chains, retrievers, tool definitions) over “magic”.
- Prefer streaming for interactive UX; fall back to non-streaming for batch tasks.
- Always add observability hooks when building anything non-trivial (tracing, dataset/evals).
- Prefer structured outputs for anything that becomes app state (use Zod schemas).

## Feature-first workflow

### 1. Classify the request

Pick one or more buckets and solve in dependency order:

- App shape: server-side only vs SvelteKit endpoints + UI streaming
- Model I/O: prompts, messages, tool calling, streaming
- Structured output: Zod schema, validation + error recovery
- RAG: loaders -> chunking -> embeddings -> vector store -> retriever -> contextual answer
- Tools: tool definitions, permissions, timeouts, retries, tool routing
- Agents: agent type, tool policy, guardrails, stopping criteria
- Memory: chat history store, summarization, retrieval-augmented memory
- Evals/observability: tracing, datasets, test cases, regression checks

### 2. Choose the runtime boundaries (Node + SvelteKit)

When SvelteKit is in play:

- Keep secrets and provider clients on the server.
- Provide a thin API boundary for the UI (SSE/streaming when requested).
- Avoid shipping provider SDKs or embeddings code to the browser.

### 3. Implement with “reliability” guardrails

For any networked LLM call or tool:

- Add timeouts + retries where appropriate.
- Normalize errors (provider errors, validation errors, tool errors).
- Ensure deterministic structured parsing for machine-consumed output (Zod).
- Keep prompts and schemas versioned/stable enough for evals.

### 4. Add tracing/evals when it matters

If the user is building an app (not a one-off script):

- Add tracing so failures can be debugged from real runs.
- Add a minimal evaluation harness (a few examples + assertions) to prevent regressions.

## Checklists by common tasks

### RAG checklist

- Define the _question type_ (fact lookup vs synthesis vs citation needed).
- Pick chunking strategy; keep chunk overlap intentional.
- Use the right embeddings model for the target language/domain.
- Choose a vector store + retrieval strategy (k, MMR, filtering, hybrid if needed).
- Add “context stuffing” limits and a fallback when retrieval is empty/low score.
- Ensure the answer format matches the UI needs (streaming text vs structured JSON).

### Tools / function calling checklist

- Define tool input/output types (Zod) and enforce them.
- Make tools idempotent where possible; document side effects.
- Add tool timeouts and safe error messages.
- Restrict tool availability by route/user role when building apps.

### Agents checklist

- Decide if an agent is actually needed (many tasks are better as: router -> tool chain -> structured output).
- Limit tools; keep tool descriptions crisp and unambiguous.
- Add stopping criteria (max iterations, max tool calls, max tokens).
- Make intermediate state debuggable (trace steps).

### Memory checklist

- Decide what must persist (none, per session, per user, long-term).
- Avoid “raw transcript forever”; use summarization + retrieval for scale.
- Guard against prompt injection in retrieved memory/context.

### Structured output checklist (Zod)

- Model the exact shape the app needs; keep it small.
- Use `safeParse` and a recovery strategy (retry with stricter instructions or fallback).
- Never trust tool output without validation.

### Streaming checklist

- Ensure the UI protocol is well-defined (SSE/chunks) and handles partial frames.
- Ensure cancellations/aborts propagate to the model call.
- Always include a final “done”/terminator event when streaming to the client.

## Output expectations (what to produce)

- Implement the requested feature with a clean separation of concerns (LLM call, retrieval, tool layer, UI boundary).
- Include a minimal test/eval plan appropriate to the change (a few inputs + expected outputs).
- If adding RAG/tools/agents, include tracing/evals hooks or a clear way to enable them.

## When to consult deeper references

If the request involves tricky design choices or failures (hallucinations, tool loops, parsing errors, latency), read `reference.md` for:

- RAG design patterns and retrieval debugging steps
- Tooling/agents guardrails and router alternatives
- Structured output recovery strategies
- Evals/tracing workflows and regression testing patterns
