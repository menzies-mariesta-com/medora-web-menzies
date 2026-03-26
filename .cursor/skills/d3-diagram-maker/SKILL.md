---
name: d3-diagram-maker
description: Generates D3-based diagrams and charts by consulting the official D3 Getting Started guide and API documentation. Use when the user asks for a D3 visualization, mentions D3, or requests D3 integration in Svelte/SvelteKit or plain HTML/JS.
---

# D3 Diagram Maker

## What this skill does

- Produces D3 implementations for common chart/diagram types (line, bar, scatter, axis-based charts, donut/pie, maps/hierarchy, force-directed layouts).
- Adapts the implementation to the requested environment (Svelte/SvelteKit or vanilla HTML/JS).
- Uses the official D3 docs as the source of truth when choosing exact function names and module APIs.

## How the agent should respond (workflow)

1. **Identify the target environment**
   - Svelte/SvelteKit: generate a Svelte component that mounts an SVG and runs D3 imperatively in `onMount` / equivalent.
   - Vanilla HTML/JS: generate an HTML page or module that selects a container and renders an SVG.
2. **Confirm the visualization contract**
   - Ask (briefly) for: chart type, data shape, width/height, and which interactions (if any) are desired.
   - If the user provided data: infer scales/domains and default accessors (e.g. `xAccessor`, `yAccessor`, `value`).
3. **Select D3 modules**
   - Use D3’s modular docs to pick the right capabilities (scales, axes, shapes, layouts, interactions).
   - Prefer minimal imports (specific d3 submodules) when the implementation will be bundled.
4. **Look up APIs in the official docs**
   - Start with the API index: `https://d3js.org/api`
   - Then open the module docs you need (base pattern): `https://d3js.org/<module>/`
   - When a function or option is uncertain, navigate from the API index to the module page and use the documented signature/options.
5. **Implement with the standard D3 patterns**
   - Use margin conventions for axis-based charts.
   - Create/update scales, axes, and the main marks (paths/rects/circles) with a clear update function.
   - Use enter/update/exit or a keyed data join where appropriate.
6. **Respect the framework’s lifecycle**
   - Svelte: run D3 DOM mutations only after mount; clean up event listeners on destroy; avoid mutating DOM in render paths.
   - Vanilla: ensure idempotent rendering (clear old SVG before redraw, or use an `update()` that rebinds data).
7. **Return a “plug-in and run” result**
   - Provide complete code for the user’s environment.
   - Include a short note showing what element/props/data shape are expected.

## Documentation entry points (from D3 site)

- Getting started: `https://d3js.org/getting-started`
- API index (module catalog): `https://d3js.org/api`
- Examples gallery: `https://observablehq.com/@d3/gallery`

## Implementation templates the agent can adapt

### Vanilla HTML/JS (SVG to a container)

Provide code that:

- Imports D3 (either `import * as d3 from "d3"` for bundlers, or the ESM CDN pattern)
- Creates an SVG inside a container
- Exposes an `update(data)` function

Example structure:

```js
// 1) Select container
const container = document.querySelector('#chart');

// 2) Create SVG
const svg = d3
	.select(container)
	.append('svg')
	.attr('width', width)
	.attr('height', height);

// 3) Create groups (axes + marks)
const gX = svg
	.append('g')
	.attr('transform', `translate(0,${height - marginBottom})`);
const gY = svg
	.append('g')
	.attr('transform', `translate(${marginLeft},0)`);
const gMarks = svg.append('g');

// 4) Update function
function update(data) {
	const x = d3
		.scaleLinear(/* domain from data */)
		.range([marginLeft, width - marginRight]);
	const y = d3
		.scaleLinear(/* domain from data */)
		.range([height - marginBottom, marginTop]);

	gX.call(d3.axisBottom(x));
	gY.call(d3.axisLeft(y));

	// keyed data join for marks (rects/circles/paths)
}
```

### Svelte/SvelteKit (mount + update)

Provide code that:

- Uses an element ref (`bind:this={container}` or similar)
- Runs D3 in `onMount`
- Re-runs `update()` when inputs change
- Cleans up listeners on destroy

Example structure:

```svelte
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as d3 from 'd3';

	export let data: Array<{ x: number; y: number }>;

	let container: HTMLDivElement | null = null;
	let cleanup: (() => void) | null = null;

	function update() {
		if (!container) return;
		// Create/update SVG + marks using D3
	}

	onMount(() => {
		update();
		// Attach listeners if needed; store cleanup
		cleanup = () => {
			// remove listeners if you added any
		};
		return cleanup;
	});

	onDestroy(() => cleanup?.());
</script>

<div bind:this={container}></div>
```

## Quality checklist (what to verify before answering)

- The D3 code compiles in the requested environment (Svelte vs vanilla).
- The chart updates when `data` changes (or at least draws once correctly).
- Axes/scales domains match the provided data.
- No duplicate SVG accumulation on rerender/redraw (clear old marks or use update pattern).
