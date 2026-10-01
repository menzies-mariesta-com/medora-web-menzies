# lib > asset > font

> Created: June 21, 2025 | Updated: September 30, 2026

## Notes

Local font binaries are **not** stored here.

**Menzies Design Wash UI** (`@menzies-mariesta-com/menzies-design-wash-ui/styles.css`) ships:

- **Fraunces** — display headings (`--font-display`)
- **Maple Mono** — body and monospace UI (`--font-sans` / `--font-mono`)

Runtime selection uses `html[data-font]` via `FontTool` (Change appearance dialog). See `src/lib/asset/style/font.style.css` for CSS variable mapping.
