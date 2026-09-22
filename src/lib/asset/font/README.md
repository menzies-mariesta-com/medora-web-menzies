# lib > asset > font

> Created: June 21, 2025 | Updated: September 22, 2026

## Notes

1. Prefer local font files (woff2/ttf). Do not load typefaces from CDNs.
2. **Menzies Design** studio faces (`design-menzies.netlify.app` → Assets → Fonts):
   - **Fraunces** / **Maple Mono** — shipped inside `@menzies-mariesta-com/menzies-design-wash-ui/styles.css`
   - **Adwaita Sans** / **Adwaita Mono** — Design catalog woff2 under `adwaita-sans/` and `adwaita-mono/` (wired in `font.style.css`)
3. Runtime selection uses `html[data-font]` via `FontTool` (Change appearance dialog).
