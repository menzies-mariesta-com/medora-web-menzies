---
name: daisyui-5-llms
description: Suggests correct DaisyUI 5 component/class usage while editing `.svelte` files. Flags invalid/unapproved class-name patterns, enforces the project’s DaisyUI/Tailwind usage rules (semantic colors, prefer DaisyUI classes over custom CSS, accessibility hints for common components), and proposes corrected markup.
---

# DaisyUI 5 LLM Rules

## When to use

Use this skill when working in the UI layer inside a `.svelte` file (components, dialogs, dropdowns, forms, tables, etc.), especially when the user asks to:

- Fix or improve DaisyUI component markup
- Convert raw Tailwind markup into DaisyUI 5 components
- Troubleshoot broken UI component behavior (tabs, accordion, modals, dropdowns)
- Review/clean up class names to match DaisyUI 5 conventions

## Core rules to enforce

1. Prefer DaisyUI component class names and their documented parts/modifiers; only use Tailwind utilities when DaisyUI doesn’t support the customization you need.
2. Avoid custom CSS unless necessary; if you must, keep it minimal and document why.
3. Prefer DaisyUI semantic colors (`primary`, `base-*`, `error`, `success`, etc.) over hard-coded Tailwind palette colors (`red-500`, `text-gray-*`, etc.).
4. Don’t add `bg-base-100 text-base-content` to `body` unless there’s a deliberate design reason.
5. Don’t add custom fonts unless necessary.
6. Only use class names that are known DaisyUI classes/parts/modifiers or Tailwind utility classes.
7. If Tailwind utility overrides fail due to specificity, use `!` sparingly at the utility level (last resort).

## Component behavior checks (common ones)

When reviewing existing markup, verify the component-specific structure/interaction rules below. If something is off, propose corrected markup.

### Buttons (`btn`)

Use:

- `btn` plus an optional modifier such as `btn-primary`, `btn-outline`, `btn-ghost`, `btn-link`, `btn-error`, etc.
  Notes:
- Icons can be placed before/after the text.
- Avoid leaving “disabled” behavior inconsistent; if the design expects disabled state, use `btn-disabled` and ensure accessibility is preserved.

### Forms: `input`, `textarea`, `select`

Use:

- `input` on the element that should look like an input.
- For floating labels, wrap the input with `floating-label` on the parent element and place the label text in the required span.
  Validation hints:
- Ensure placeholders and labels are present for usability.

### Tooltip (`tooltip`)

Structure:

- Wrap the target element with `div.tooltip` and add `data-tip="..."`.
  Placement:
- Add a placement modifier when needed (e.g. `tooltip-right`, `tooltip-bottom`).

### Dropdown (`dropdown`)

Pick one supported approach:

- `details.dropdown` + `summary` + `ul.dropdown-content`
- CSS focus dropdown (use `tabindex="0"`/`role="button"` on the trigger and `tabindex="-1"` on the content)
- Popover API (use `popovertarget`, `popover`, `id`, and anchor positioning)
  Check:
- Ensure the trigger/content pairing is correct and that focus interaction is accessible.

### Modal (`modal`)

Use unique ids/targets:

- Each modal must have a unique id.
  For `dialog`-based modals:
- Use `<dialog id="...">` with a `.modal` class.
- Include `<form method="dialog" class="modal-backdrop">...` so the user can close using the backdrop.
  Legacy checkbox/anchor:
- Use unique `id`s or unique anchors.
  Check:
- Ensure there is a clear, accessible close path.

### Accordion (`collapse`)

Behavior:

- Accordions are radio-input driven: only one item stays open per group.
  Check:
- If multiple accordions exist on the same page, ensure unique `name` attributes for their radio inputs.

### Tabs (`tabs`)

Behavior:

- Tabs require radio inputs for the content switching.
  Check:
- Ensure proper `role="tablist"` / `role="tab"` usage if using button-based tabs.
- Ensure the radio group name is unique for the tab set.

### Table (`table`)

Wrap:

- Use a wrapper `div.overflow-x-auto` so tables remain usable on small screens.
  Component:
- Add `table` to the `<table>` element and use table modifiers only when needed (e.g. `table-zebra`).

### Theme (`theme-controller`)

If theming is used:

- Ensure the controller input value corresponds to a valid DaisyUI theme name.

## Color guidance

When suggesting changes, prefer:

- `bg-base-*` / `text-base-content` combinations that match the chosen theme semantics
- DaisyUI semantic colors (`primary`, `neutral`, `success`, `warning`, `error`, etc.)

Avoid:

- Tailwind-only palette colors for semantic UI intent.
- Hard-coded text colors that may become unreadable in dark mode.

## Output requirements for answers

When the user asks for help editing code, respond with:

1. A brief explanation of what violates the DaisyUI 5 rules (1-3 sentences).
2. The corrected markup/class changes (prefer minimal diffs).
3. Any required accessibility/behavior fixes (aria/role/id/name uniqueness).
