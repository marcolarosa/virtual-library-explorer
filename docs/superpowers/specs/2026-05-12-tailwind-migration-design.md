# Tailwind CSS Migration Design

**Date:** 2026-05-12  
**Scope:** Replace `styles/main.css` component styles with Tailwind utility classes

## Summary

Migrate all custom CSS component styles to Tailwind CSS utility classes. Use the Play CDN (single script tag, no build step) to stay consistent with the project's no-build philosophy. The existing `styles/main.css` is reduced to only the three things Tailwind cannot replace.

## Approach

**Tailwind integration:** Play CDN via `<script src="https://cdn.tailwindcss.com"></script>` in `index.html`, with an inline `tailwind.config` object defining the custom theme.

**Custom theme tokens** (mapped from CSS custom properties):
- Colors: `bg` (#080c10), `surface` (#0f1520), `surface2` (#16202e), `border-col` (#1e2d42), `text-col` (#c8d8e8), `text-dim` (#5a7090), `text-bright` (#e8f0f8), `gold` (#ffd700), `accent` (#3a8fff)
- Fonts: `mono` (JetBrains Mono stack), `sans` (Inter stack)
- Spacing/sizing: `panel` (320px) for the drawer width
- Shadow: `panel` (`0 4px 24px rgba(0,0,0,0.6)`) added to `theme.extend.boxShadow`
- Transition: base `transition-all duration-200 ease-in-out` used wherever `var(--transition)` appeared

## Files Changed

### `index.html`
- Remove `<link rel="stylesheet" href="styles/main.css">`
- Add Tailwind Play CDN script and inline `tailwind.config`
- Replace all static element `class` attributes with Tailwind utility classes

### `styles/main.css`
Reduced to only:
1. `::-webkit-scrollbar` / `::-webkit-scrollbar-track` / `::-webkit-scrollbar-thumb` custom scrollbar styles
2. `@keyframes blink` + `.blink { animation: blink 1s infinite }`
3. `#graph-container canvas { display: block }` (nested selector, not expressible with utilities)

### `src/ui.js`
- All `innerHTML` template strings: class names replaced with Tailwind utilities
- All `element.className = '...'` assignments updated
- All `classList.add/remove/toggle` calls updated

## Constraints

- The `--chip-color` CSS variable (per-element source color on filter chips) stays as an inline `style` attribute — Tailwind cannot handle per-element dynamic custom properties.
- Dynamic class names in JS `innerHTML` strings are visible to Tailwind's Play CDN runtime scanner, so no safelist is needed.
- `#detail-close` uses `position: absolute` with specific top/right offsets — mapped to `absolute top-[10px] right-[10px]` using Tailwind arbitrary values.
- `body { font-size: 13px }` and other base resets are applied via Tailwind's `text-[13px]` arbitrary value or the `base` layer config.

## Out of Scope

- No logic changes in any JS module
- No HTML structure changes
- No new features
