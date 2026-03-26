## D3 documentation entry points

- Getting started: `https://d3js.org/getting-started`
- API index (complete module catalog): `https://d3js.org/api`
- Examples gallery (ready-made visual patterns): `https://observablehq.com/@d3/gallery`

## How to navigate “all documentation” quickly

Treat the API index as the canonical catalog of D3 modules.

1. Open the API index: `https://d3js.org/api`
2. Click the module that matches your need (scales, axes, shapes, interactions, layouts, etc.).
3. Use that module page’s sections to find the exact function/operator you want.

## Common module doc URL patterns

- Module landing page: `https://d3js.org/<module>/`
- Example modules (use as entry points, then follow links from the module page):
  - `https://d3js.org/d3-array/`
  - `https://d3js.org/d3-scale/`
  - `https://d3js.org/d3-axis/`
  - `https://d3js.org/d3-shape/`
  - `https://d3js.org/d3-interpolate/`
  - `https://d3js.org/d3-time/`
  - `https://d3js.org/d3-format/`
  - `https://d3js.org/d3-transition/`
  - `https://d3js.org/d3-zoom/`
  - `https://d3js.org/d3-brush/`
  - `https://d3js.org/d3-drag/`
  - `https://d3js.org/d3-force/`
  - `https://d3js.org/d3-hierarchy/`
  - `https://d3js.org/d3-geo/`
  - `https://d3js.org/d3-dispatch/`
  - `https://d3js.org/d3-selection/`

## Implementation guidance (what to look up in docs)

When generating a new diagram, the agent should consult docs for:

- The correct function signature for scales/axes (`scale*`, `axis*`).
- How to build path generators and shapes (`d3-shape`).
- Event API patterns for interactions (`d3-zoom`, `d3-brush`, `d3-drag`).
- Update mechanics for transitions/animations (`d3-transition`).
