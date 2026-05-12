# Tailwind CSS Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all custom CSS component styles with Tailwind utility classes using the Play CDN.

**Architecture:** Tailwind Play CDN loaded via `<script>` tag with an inline `tailwind.config` block defining the custom color/font/spacing tokens. Component styles move to inline class attributes in `index.html` and dynamic string templates in `src/ui.js`. `styles/main.css` is reduced to three items Tailwind cannot express: custom scrollbar rules, `@keyframes blink`, and the nested `#graph-container canvas` selector.

**Tech Stack:** Tailwind CSS Play CDN (v3, cdn.tailwindcss.com)

---

### Token reference

The inline config maps CSS variables to Tailwind tokens:

| CSS var | Tailwind color name | Example class |
|---------|--------------------|----|
| `--bg #080c10` | `bg` | `bg-bg` |
| `--surface #0f1520` | `surface` | `bg-surface` |
| `--surface2 #16202e` | `surface2` | `bg-surface2` |
| `--border #1e2d42` | `border` | `border-border` |
| `--text #c8d8e8` | `text` | `text-text` |
| `--text-dim #5a7090` | `dim` | `text-dim` |
| `--text-bright #e8f0f8` | `bright` | `text-bright` |
| `--gold #ffd700` | `gold` | `text-gold` |
| `--accent #3a8fff` | `accent` | `bg-accent` |

`spacing.panel = 320px` → `w-panel`, `-translate-x-full` (100% of own width)  
`boxShadow.panel` → `shadow-panel`

---

### Task 1: Add Tailwind CDN + config; remove stylesheet link

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace the `<link rel="stylesheet">` line**

In `index.html`, replace:
```html
  <link rel="stylesheet" href="styles/main.css">
```
With:
```html
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            bg:       '#080c10',
            surface:  '#0f1520',
            surface2: '#16202e',
            border:   '#1e2d42',
            text:     '#c8d8e8',
            dim:      '#5a7090',
            bright:   '#e8f0f8',
            gold:     '#ffd700',
            accent:   '#3a8fff',
          },
          fontFamily: {
            mono: ["'JetBrains Mono'", "'Fira Code'", "'Courier New'", 'monospace'],
            sans: ["'Inter'", "'Segoe UI'", 'system-ui', 'sans-serif'],
          },
          spacing: { panel: '320px' },
          boxShadow: { panel: '0 4px 24px rgba(0,0,0,0.6)' },
        },
      },
    }
  </script>
  <link rel="stylesheet" href="styles/main.css">
```

(Keep `main.css` for now — it is trimmed in Task 3.)

- [ ] **Step 2: Add base classes to `<html>` and `<body>`**

```html
<html lang="en" class="h-full overflow-hidden">
```
```html
<body class="h-full bg-bg text-text font-sans text-[13px]">
```

- [ ] **Step 3: Commit**
```bash
git add index.html
git commit -m "chore: add Tailwind Play CDN with custom theme config"
```

---

### Task 2: Migrate static elements in index.html

**Files:**
- Modify: `index.html`

- [ ] **Step 1: App shell and graph container**

```html
<div id="app" class="relative w-screen h-screen">
```
```html
<div id="graph-container" class="absolute inset-0">
```

- [ ] **Step 2: Search bar header and its children**

```html
<header id="search-bar" class="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-surface border border-border rounded-[32px] px-2.5 py-1.5 shadow-panel z-[100] min-w-[480px]">
```

```html
<button id="collection-toggle" class="bg-transparent border border-border text-text rounded-[20px] py-1 px-2 cursor-pointer text-[14px] transition-colors duration-200 hover:bg-border" title="Toggle collection">⊞</button>
```

```html
<input id="search-input" type="text" class="flex-1 bg-transparent border-none text-bright font-mono text-[14px] outline-none px-1.5 placeholder:text-dim" placeholder="Search across libraries…" autocomplete="off" spellcheck="false">
```

```html
<button id="search-btn" class="bg-accent text-white border border-accent rounded-[20px] py-1 px-3 cursor-pointer text-xs transition-colors duration-200 whitespace-nowrap hover:bg-[#2070dd]">Search</button>
```

```html
<button id="import-btn" class="bg-transparent border border-border text-text rounded-[20px] py-1 px-2 cursor-pointer text-[14px] transition-colors duration-200 hover:bg-border" title="Load graph">↑</button>
<button id="export-btn" class="bg-transparent border border-border text-text rounded-[20px] py-1 px-2 cursor-pointer text-[14px] transition-colors duration-200 hover:bg-border" title="Export collection">↓</button>
<button id="keys-btn"   class="bg-transparent border border-border text-text rounded-[20px] py-1 px-2 cursor-pointer text-[14px] transition-colors duration-200 hover:bg-border" title="API Keys">⚿</button>
```

- [ ] **Step 3: Status bar**

```html
<div id="status-bar" class="absolute top-16 left-1/2 -translate-x-1/2 flex gap-1.5 flex-wrap justify-center z-[100] pointer-events-none"></div>
```

- [ ] **Step 4: Collection drawer (left)**

`collapsed` state is replaced by `-translate-x-full` (slides left off-screen by 100% of own width = 320px).

```html
<aside id="collection-drawer" class="absolute top-0 bottom-0 w-panel bg-surface border border-border border-l-0 rounded-r-md flex flex-col transition-transform duration-200 ease-in-out z-[200] overflow-hidden left-0 -translate-x-full">
```

```html
<div class="flex items-center justify-between px-3.5 py-3 border-b border-border font-semibold text-bright shrink-0">
  <span>Collection</span>
  <button id="collection-close" class="bg-transparent border-none text-dim cursor-pointer text-[18px] px-1 hover:text-bright">×</button>
</div>
```

```html
<div id="collection-list" class="flex-1 overflow-y-auto py-2"></div>
```

```html
<div class="py-2.5 px-3.5 border-t border-border shrink-0">
  <button id="export-btn-2" class="w-full py-2 bg-surface2 border border-border text-text rounded-[6px] cursor-pointer hover:bg-border">Export collection JSON</button>
</div>
```

- [ ] **Step 5: Detail panel (right)**

`hidden` → `translate-x-full` (slides right off-screen). `hidden` is kept for modals/warnings where it means `display:none`.

```html
<aside id="detail-panel" class="absolute top-0 bottom-0 w-panel bg-surface border border-border border-r-0 rounded-l-md flex flex-col transition-transform duration-200 ease-in-out z-[200] overflow-y-auto p-4 right-0 translate-x-full">
  <button id="detail-close" class="absolute top-[10px] right-[10px] bg-transparent border-none text-dim cursor-pointer text-[20px] z-[1] hover:text-bright">×</button>
  <div id="detail-content"></div>
</aside>
```

- [ ] **Step 6: Source panel**

```html
<div id="source-panel" class="absolute top-4 right-4 bg-surface border border-border rounded-[6px] shadow-panel z-[100] min-w-[200px]">
  <div id="source-panel-header" class="flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-[1px] text-dim">
    Sources
    <button id="source-panel-toggle" class="bg-transparent border-none text-dim cursor-pointer text-[14px]">−</button>
  </div>
  <div id="source-list" class="pt-1 pb-2"></div>
</div>
```

- [ ] **Step 7: Controls**

`toggle-labels` starts active (`state.labelsVisible` defaults true) so it gets accent classes.

```html
<div id="controls" class="absolute bottom-6 left-4 flex flex-col gap-1.5 z-[100]">
  <button id="zoom-fit"      class="w-9 h-9 bg-surface border border-border text-dim rounded-[6px] cursor-pointer text-[14px] shadow-panel transition-colors duration-200 hover:text-bright hover:bg-surface2" title="Zoom to fit">⊡</button>
  <button id="pause-physics" class="w-9 h-9 bg-surface border border-border text-dim rounded-[6px] cursor-pointer text-[14px] shadow-panel transition-colors duration-200 hover:text-bright hover:bg-surface2" title="Pause physics">⏸</button>
  <button id="toggle-labels" class="w-9 h-9 bg-surface border border-accent text-accent rounded-[6px] cursor-pointer text-[14px] shadow-panel transition-colors duration-200 hover:text-bright hover:bg-surface2" title="Toggle labels">Aa</button>
  <button id="reset-graph"   class="w-9 h-9 bg-surface border border-border text-dim rounded-[6px] cursor-pointer text-[14px] shadow-panel transition-colors duration-200 hover:text-bright hover:bg-surface2" title="Reset graph">↺</button>
</div>
```

- [ ] **Step 8: Filter panel**

```html
<div id="filter-panel" class="absolute bottom-6 left-16 z-[100] flex flex-col gap-1.5">
  <div id="filter-sources" class="flex flex-wrap gap-1"></div>
  <div id="filter-types"   class="flex flex-wrap gap-1"></div>
</div>
```

- [ ] **Step 9: Node cap warning**

`hidden` here is Tailwind `display:none` — correct, as JS toggles it with `classList.add/remove('hidden')`.

```html
<div id="node-cap-warning" class="hidden absolute bottom-6 left-1/2 -translate-x-1/2 bg-[rgba(255,107,107,0.15)] border border-[#ff6b6b] text-[#ff6b6b] rounded-[6px] px-4 py-2 text-xs z-[100] pointer-events-none">
  Graph limit reached (500 nodes) — reset to continue exploring.
</div>
```

- [ ] **Step 10: API keys modal**

`hidden` is Tailwind `display:none` here too — correct.

```html
<div id="keys-modal" class="hidden absolute inset-0 bg-black/70 flex items-center justify-center z-[500]">
  <div class="bg-surface border border-border rounded-[6px] p-6 w-[480px] max-w-[90vw] shadow-panel">
    <h3 class="text-bright mb-2">API Keys</h3>
    <p class="text-dim text-[11px] mb-4 leading-[1.5]">
      Keys are stored in your browser's <code>localStorage</code>.
      Use throwaway dev keys — they may be visible to CORS proxy operators if the direct request fails.
    </p>
    <div id="keys-form"></div>
    <div class="flex gap-2 justify-end mt-4">
      <button id="keys-cancel" class="py-2 px-5 rounded-[6px] cursor-pointer text-[13px] border border-border bg-surface2 text-text">Cancel</button>
      <button id="keys-save"   class="py-2 px-5 rounded-[6px] cursor-pointer text-[13px] border border-accent bg-accent text-white">Save keys</button>
    </div>
  </div>
</div>
```

- [ ] **Step 11: Commit**
```bash
git add index.html
git commit -m "chore: migrate index.html static elements to Tailwind utility classes"
```

---

### Task 3: Slim down styles/main.css

**Files:**
- Modify: `styles/main.css`

- [ ] **Step 1: Replace entire file content**

```css
/* blink animation — no Tailwind equivalent */
@keyframes blink { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
.blink { animation: blink 1s infinite }

/* nested canvas selector — not expressible as a utility */
#graph-container canvas { display: block }

/* custom scrollbars — not in Tailwind core */
::-webkit-scrollbar       { width: 6px }
::-webkit-scrollbar-track { background: #0f1520 }
::-webkit-scrollbar-thumb { background: #1e2d42; border-radius: 3px }
::-webkit-scrollbar-thumb:hover { background: #2a3f5a }
```

- [ ] **Step 2: Start server and do a quick visual check**

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`. Verify:
- Dark background, no white flash
- Search bar centred at top with pill shape
- Source panel visible top-right
- Control buttons bottom-left; "Aa" button has blue accent colour
- Page is not showing unstyled HTML (would mean CDN failed to load)

- [ ] **Step 3: Commit**
```bash
git add styles/main.css
git commit -m "chore: reduce styles/main.css to scrollbars, blink keyframe, canvas selector"
```

---

### Task 4: Migrate ui.js — source panel and filter chips

**Files:**
- Modify: `src/ui.js`

- [ ] **Step 1: Update `renderSourcePanel` — row class and innerHTML**

Replace `row.className` and `row.innerHTML` (lines ~129–146):

```js
row.className = 'flex items-center gap-1.5 px-3 py-1 text-xs'

const statusText = {
  idle: 'idle',
  querying: '<span class="blink">querying…</span>',
  done: `${status.count} results${status.latency ? ' · ' + status.latency + 'ms' : ''}`,
  error: '<span class="text-[#ff6b6b]">error</span>',
}[status.status] || 'idle'

row.innerHTML = `
  <span class="w-2 h-2 rounded-full shrink-0" style="background:${src.color}"></span>
  <label class="flex items-center gap-1 cursor-pointer flex-1">
    <input type="checkbox" ${src.enabled ? 'checked' : ''}>
    <span class="text-text">${src.shortLabel}</span>
  </label>
  <span class="text-[10px] text-dim font-mono">${statusText}${src.requiresKey && !API_KEYS[src.id] ? ' <span class="cursor-help" title="No API key set">⚿</span>' : ''}</span>
`
```

- [ ] **Step 2: Update `setupFilters` — source chip**

Replace the `label.className` + `label.style.setProperty` lines in the source filter loop:

```js
label.className = 'flex items-center gap-1 py-[3px] px-2 rounded-[10px] bg-surface border border-border text-dim text-[11px] cursor-pointer hover:bg-surface2'
label.style.borderLeft = `3px solid ${src.color}`
label.innerHTML = `<input type="checkbox" checked data-source="${src.id}"> ${src.shortLabel}`
```

(Remove the `label.style.setProperty('--chip-color', src.color)` line entirely.)

- [ ] **Step 3: Update `setupFilters` — type chip**

Replace the `label.className` line in the type filter loop:

```js
label.className = 'flex items-center gap-1 py-[3px] px-2 rounded-[10px] bg-surface border border-border text-dim text-[11px] cursor-pointer hover:bg-surface2'
```

- [ ] **Step 4: Commit**
```bash
git add src/ui.js
git commit -m "chore: migrate source panel and filter chips to Tailwind"
```

---

### Task 5: Migrate ui.js — collection drawer

**Files:**
- Modify: `src/ui.js`

- [ ] **Step 1: Update empty-state message**

```js
list.innerHTML = '<p class="text-dim px-3.5 py-5 text-center leading-[1.6]">No items pinned yet.<br>Click a node and pin it.</p>'
```

- [ ] **Step 2: Update group header**

```js
group.className = 'mb-2'
group.innerHTML = `<div class="font-mono text-[10px] uppercase tracking-[1px] px-3.5 py-1.5 font-semibold" style="color:${src?.color || '#888'}">${src?.label || sourceId}</div>`
```

- [ ] **Step 3: Update collection item**

```js
item.className = 'px-3.5 py-2 border-b border-border hover:bg-surface2'
item.innerHTML = `
  <div class="text-xs text-bright mb-1">${truncate(entry.label, 50)}</div>
  <textarea class="w-full bg-bg border border-border text-text rounded-[4px] px-1.5 py-1 text-[11px] font-sans resize-y mb-1" placeholder="Add note…" rows="2">${entry.annotation || ''}</textarea>
  <div class="flex gap-1.5">
    <button class="py-0.5 px-2 text-[11px] rounded-[4px] bg-surface2 border border-border text-text cursor-pointer hover:bg-border" data-action="focus" data-id="${nodeId}">Find</button>
    <button class="py-0.5 px-2 text-[11px] rounded-[4px] bg-surface2 border border-border text-[#ff6b6b] cursor-pointer hover:bg-[rgba(255,107,107,0.15)]" data-action="unpin" data-id="${nodeId}">Remove</button>
  </div>
`
```

- [ ] **Step 4: Commit**
```bash
git add src/ui.js
git commit -m "chore: migrate collection drawer rendering to Tailwind"
```

---

### Task 6: Migrate ui.js — detail panel

**Files:**
- Modify: `src/ui.js`

- [ ] **Step 1: Replace tag class constant before the innerHTML template**

Add before `$('detail-content').innerHTML`:

```js
const tagCls = 'text-[11px] py-0.5 px-2 rounded-[10px] bg-surface2 border border-border text-text cursor-pointer transition-colors duration-200 hover:bg-accent hover:text-white hover:border-accent'
const subjectTags = (node.rawSubjects || [])
  .map(s => `<span class="${tagCls}" data-search="${s}">${s}</span>`).join('')
const creatorTags = (node.rawCreators || [])
  .map(c => `<span class="${tagCls}" data-search="${c}">${c}</span>`).join('')
```

(Remove the old `subjectTags`/`creatorTags` declarations that used `.tag`.)

- [ ] **Step 2: Replace `$('detail-content').innerHTML` template**

```js
$('detail-content').innerHTML = `
  <div class="flex gap-1.5 flex-wrap mb-2.5">
    <span class="text-[10px] py-0.5 px-2 rounded-[10px] font-mono uppercase tracking-[0.5px] bg-surface2 text-dim">${node.type}</span>
    <span class="text-[10px] py-0.5 px-2 rounded-[10px] font-mono uppercase tracking-[0.5px] text-black font-semibold" style="background:${src?.color || '#888'}">${src?.shortLabel || node.sourceId}</span>
    ${node.expanded ? '<span class="text-[10px] py-0.5 px-2 rounded-[10px] font-mono uppercase tracking-[0.5px] bg-[rgba(58,143,255,0.2)] text-accent">expanded</span>' : ''}
    ${isPinned ? '<span class="text-[10px] py-0.5 px-2 rounded-[10px] font-mono uppercase tracking-[0.5px] bg-[rgba(255,215,0,0.2)] text-gold">pinned</span>' : ''}
  </div>
  <h2 class="text-[15px] font-semibold text-bright mb-1.5 leading-[1.4]">${node.label || 'Untitled'}</h2>
  ${result.date ? `<div class="font-mono text-[11px] text-dim mb-2">${result.date}</div>` : ''}
  ${result.thumbnailUrl ? `<img class="w-full max-h-[160px] object-cover rounded-[4px] mb-2.5" src="${result.thumbnailUrl}" alt="">` : ''}
  ${result.description ? `<p class="text-xs text-text leading-[1.6] mb-2.5">${result.description}</p>` : ''}
  ${creatorTags ? `<div class="mb-2"><span class="text-[10px] uppercase tracking-[1px] text-dim block mb-1">Creators</span><div class="flex flex-wrap gap-1">${creatorTags}</div></div>` : ''}
  ${subjectTags ? `<div class="mb-2"><span class="text-[10px] uppercase tracking-[1px] text-dim block mb-1">Subjects</span><div class="flex flex-wrap gap-1">${subjectTags}</div></div>` : ''}
  ${result.url && result.url !== '#' ? `<a class="inline-block text-xs text-accent no-underline mb-3 hover:underline" href="${result.url}" target="_blank" rel="noopener">View original record ↗</a>` : ''}
  <div class="flex flex-col gap-1.5 mt-3">
    <button id="pin-btn" class="py-2 px-3 rounded-[6px] bg-surface2 border cursor-pointer text-xs transition-colors duration-200 hover:bg-border ${isPinned ? 'text-gold border-gold' : 'text-text border-border'}">${isPinned ? '★ Unpin' : '☆ Pin to collection'}</button>
    ${canExpand ? '<button id="expand-btn" class="py-2 px-3 rounded-[6px] bg-surface2 border border-border text-text cursor-pointer text-xs transition-colors duration-200 hover:bg-border">Explore from here</button>' : ''}
    ${!state.importedMode ? '<button id="link-btn" class="py-2 px-3 rounded-[6px] bg-surface2 border border-border text-text cursor-pointer text-xs transition-colors duration-200 hover:bg-border">Link to another node</button>' : ''}
  </div>
  ${isPinned ? `
    <div class="mt-3">
      <label class="text-[10px] uppercase tracking-[1px] text-dim block mb-1">Note</label>
      <textarea id="annotation-input" rows="3" placeholder="Add a note…" class="w-full bg-bg border border-border text-text rounded-[4px] p-1.5 text-xs font-sans resize-y">${node.annotation || ''}</textarea>
    </div>
  ` : ''}
`
```

- [ ] **Step 3: Update `link-btn` active state**

Replace `linkBtn.classList.add('active')` with:

```js
linkBtn.textContent = 'Click another node to link…'
linkBtn.classList.remove('bg-surface2', 'text-text', 'border-border')
linkBtn.classList.add('bg-accent', 'text-white', 'border-accent')
```

(Remove the duplicate `linkBtn.textContent` line that was below the original `classList.add`.)

- [ ] **Step 4: Update tag click selector**

Change:
```js
$('detail-content').querySelectorAll('.tag[data-search]').forEach(tag => {
```
To:
```js
$('detail-content').querySelectorAll('[data-search]').forEach(tag => {
```

- [ ] **Step 5: Commit**
```bash
git add src/ui.js
git commit -m "chore: migrate detail panel rendering to Tailwind"
```

---

### Task 7: Migrate ui.js — status bar, keys modal, drawer helpers, active toggle

**Files:**
- Modify: `src/ui.js`

- [ ] **Step 1: Update `updateStatusBar`**

Replace the `cls` variable and chip template:

```js
const chipBase = 'font-mono text-[11px] py-0.5 px-2 rounded-xl border bg-[rgba(8,12,16,0.8)] whitespace-nowrap'
const clsExtra = s.status === 'error' ? ' text-[#ff6b6b]' : s.status === 'querying' ? ' opacity-70' : ''
return `<span class="${chipBase}${clsExtra}" style="border-color:${src?.color || '#888'}"
  title="${src?.label || id}: ${s.status}${s.latency ? ' · ' + s.latency + 'ms' : ''}"
>${src?.shortLabel || id} ${label}</span>`
```

(Remove the old `const cls = ...` line.)

- [ ] **Step 2: Update `openKeysModal` row**

```js
row.className = 'mb-3'
row.innerHTML = `
  <label class="block text-[11px] mb-1 font-semibold" style="color:${src.color}">${src.label}</label>
  <input type="text" class="key-input w-full bg-bg border border-border text-text rounded-[4px] py-1.5 px-2 font-mono text-xs outline-none focus:border-accent" data-source="${src.id}"
    value="${API_KEYS[src.id] || ''}"
    placeholder="Paste API key…"
    spellcheck="false" autocomplete="off">
`
```

(`key-input` class is kept so `saveKeys` can query `.key-input[data-source]`.)

- [ ] **Step 3: Replace `collapsed` with `-translate-x-full` in drawer helpers**

```js
function toggleDrawer(id) {
  $(id).classList.toggle('-translate-x-full')
}

function closeDrawer(id) {
  $(id).classList.add('-translate-x-full')
}
```

- [ ] **Step 4: Replace `hidden` with `translate-x-full` in detail panel show/hide**

In `showDetailPanel`:
```js
$('detail-panel').classList.remove('translate-x-full')
```

In `hideDetailPanel`:
```js
$('detail-panel').classList.add('translate-x-full')
```

- [ ] **Step 5: Replace `active` toggle on toggle-labels button**

```js
const btn = $('toggle-labels')
btn.classList.toggle('text-accent',   state.labelsVisible)
btn.classList.toggle('border-accent', state.labelsVisible)
btn.classList.toggle('text-dim',      !state.labelsVisible)
btn.classList.toggle('border-border', !state.labelsVisible)
```

- [ ] **Step 6: Commit**
```bash
git add src/ui.js
git commit -m "chore: migrate status bar, keys modal, and drawer helpers to Tailwind"
```

---

### Task 8: Full visual verification

- [ ] **Step 1: Start server**
```bash
python3 -m http.server 8080
```

- [ ] **Step 2: Static layout check**

Open `http://localhost:8080`. Verify (no search needed):
- Background is very dark, not white
- Search pill centred at top; all icon buttons visible with border
- Source panel top-right with source rows
- Four control buttons bottom-left; "Aa" is blue
- Filter chips absent (populated after first search)

- [ ] **Step 3: Interaction check**

- Click ⊞ → collection drawer slides in from left; click × → slides back
- Run a search → status chips appear below search bar, source rows update with counts
- Click a result node → detail panel slides in from right with badges, title, tags
- Click a tag → triggers new search, panel hides
- Click ☆ Pin → re-renders panel with gold "pinned" badge and annotation textarea
- Click ⚿ → API keys modal opens; Cancel closes it; Save persists keys
- Click Aa → border/text toggles between blue accent and dim grey
- 500+ nodes → node cap warning appears at bottom centre

- [ ] **Step 4: Console check**

Open DevTools → Console. No JS errors should appear during any of the above interactions.

- [ ] **Step 5: Fix and commit any regressions found**
```bash
git add -p
git commit -m "fix: correct Tailwind class regressions from migration"
```
