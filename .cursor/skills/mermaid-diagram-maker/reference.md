## Mermaid documentation entry points

- Mermaid homepage: `https://mermaid.js.org/`
- Syntax docs (by diagram type): `https://mermaid.js.org/syntax/`
- Live editor (syntax validation): `https://mermaid.live/`

## How to choose the right Mermaid diagram

- **Flowchart**: “What happens next?”, “decision branches”, “pipeline”
- **Sequence diagram**: “Who calls whom?”, “request/response timing”
- **Class diagram**: “What types/classes exist and how are they related?”
- **State diagram**: “How does an entity move between states over time?”
- **ER diagram**: “Which tables/entities exist and what are the cardinalities?”
- **Gantt**: “Timeline + task durations + dependencies”
- **Journey**: “Customer journey by stages/touchpoints”

## Common building blocks & conventions

### Flowchart

- Prefer `flowchart TD` for “top to bottom” readability; use `flowchart LR` for left-to-right.
- Use readable node IDs:
  - Good: `Start`, `Check`, `Done`
  - Avoid: auto-generated opaque IDs unless the user explicitly asked for “compact syntax”
- Label edge conditions explicitly:
  - `A -->|Yes| B`
  - `A -->|No| C`
- Use grouping when modules/components are involved:
  - `subgraph Billing`

### Sequence

- Always define participants explicitly (with `as` aliases if needed).
- Use clear message direction arrows:
  - `->>` (request/forward)
  - `-->>` (return)
- Keep message text short; move long descriptions into node labels in a flowchart if needed.

### Class / ER

- For class diagrams, keep types readable and relationships explicit (`-->`, multiplicities in quotes).
- For ER diagrams, model cardinality carefully:
  - `||--o{` / `}o--||` style is common; match what the user stated.

### State

- Prefer `stateDiagram-v2` if available.
- Use `[*]` for start/end pseudo-states.
- When the user provides events (e.g. `submit`, `approve`), include them on transition labels.

### Gantt

- Set `dateFormat` when the user gives dates.
- Use `section` to represent phases (Planning/Build/Testing/etc.).

## Copy-paste “answer format” to follow

- Provide exactly one Mermaid fenced block:
  - `` `mermaid
    <mermaid code here>

    ```

    ```

- Then, only if needed, add up to 3 short bullets:
  - **Assumptions**: what you inferred (direction, grouping, missing relationships, etc.)
