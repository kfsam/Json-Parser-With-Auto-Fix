# JSON Parser — Revamp Design

**Date:** 2026-08-07
**Status:** Approved (pending spec review)
**Scope:** Full rebuild of the existing vanilla HTML/CSS/JS JSON parser as a modern React + Tailwind app, preserving all current features, adding three new capabilities, with three switchable themes and responsive support.

---

## 1. Goals & Non-Goals

### Goals
- Rebuild the JSON parser as a modern, maintainable React + TypeScript + Tailwind app.
- Preserve **all** existing functionality: parse, format, minify, auto-fix, clear, copy, real-time error highlighting, text view, tree view, JSON-path + PHP-path finder (click-to-copy and find-by-path), and localStorage history.
- Add: **line numbers + jump-to-error**, **import .json via drag & drop**, **JSON ⇄ YAML / CSV conversion**.
- Three switchable themes — **Midnight** (default), **Daylight**, **Aurora** — applied app-wide including the code editor.
- Fully responsive layout: two-pane on desktop with a slide-in history drawer, stacking down to single-column on mobile.

### Non-Goals
- No backend / server / accounts. Stays a client-only static app.
- No JSON-schema validation or external API fetching.
- No diff/compare tool, no multi-tab editing (single document).
- No persistence beyond `localStorage` (history + theme).

---

## 2. Stack

| Concern | Choice |
|---|---|
| Build / dev server | **Vite** |
| UI framework | **React 18 + TypeScript** |
| Styling | **Tailwind CSS** + a small semantic class layer backed by CSS variables |
| Code editor | **CodeMirror 6** (`@codemirror/state`, `@codemirror/view`, `@codemirror/lang-json`, `@codemirror/lint`, `@codemirror/commands`) |
| State | **Zustand** (single small store) |
| YAML conversion | **js-yaml** |
| CSV conversion | hand-rolled flatten/serialize in `lib/convert.ts` |
| Tests | **Vitest** + **@testing-library/react** |
| Deploy output | static `dist/` (hosted the same way `index.html` is today) |

---

## 3. Project Structure

```
src/
  main.tsx                      # entry, mounts <App/>
  App.tsx                       # layout shell; wires store + ThemeProvider
  index.css                     # Tailwind directives + theme CSS variables + semantic classes
  store.ts                      # Zustand store: state + actions
  types.ts                      # shared types (ThemeName, HistoryItem, ParseError, ...)
  theme/
    themes.ts                   # three theme token maps → CSS variable values
    ThemeContext.tsx            # theme state, localStorage persistence, sets [data-theme] on root
    cmTheme.ts                  # builds a CodeMirror theme from the active token map
  lib/
    json.ts                     # parse / format / minify / validate (pure)
    autofix.ts                  # attemptAutoFix, ported + improved (pure)
    paths.ts                    # getValueByPath, jsonPath↔phpPath↔bracket notation (pure)
    highlight.ts                # syntaxHighlight for text output (pure)
    convert.ts                  # JSON⇄YAML (js-yaml), JSON⇄CSV flatten/parse (pure)
    history.ts                  # localStorage CRUD, typed (pure)
  hooks/
    useLocalStorage.ts
    useDebounced.ts             # debounced value for live lint
  components/
    Header.tsx                  # title, ThemeSwitcher, history ☰ toggle
    ThemeSwitcher.tsx           # segmented control: Midnight / Daylight / Aurora
    Editor/
      CodeEditor.tsx            # CodeMirror 6 wrapper (line numbers, JSON mode, linter)
      Toolbar.tsx               # Parse · Format · Minify · Auto Fix · Clear · Import · ConvertMenu
      FileDrop.tsx              # drag-drop + <input type=file> overlay wrapping the editor
    Output/
      OutputPanel.tsx           # Text/Tree toggle + container
      TextView.tsx              # syntax-highlighted <pre>
      TreeView.tsx              # collapsible tree, click-node-to-get-path (ported)
    PathFinder/
      PathFinder.tsx            # JSON path + PHP path display/copy, find-by-path, result preview
    History/
      HistoryDrawer.tsx         # slide-in drawer; load / delete / clear-all
    ConvertMenu.tsx             # to YAML / to CSV / from YAML / from CSV
    ui/                         # shared primitives (Button, Toast, Segmented, Modal)
```

**Design principle — `lib/` is pure:** all parsing, fixing, path, conversion, and history logic lives in framework-free, side-effect-free modules (history touches `localStorage` but is still isolated and typed). This is the central quality improvement over the current `JSONParser` class, where logic and DOM manipulation are interleaved. Pure modules are independently unit-testable and keep components thin.

---

## 4. Component Architecture

### Header
- App title/logo.
- `ThemeSwitcher`: segmented control with three options. Changing it updates the store, which persists to `localStorage` and sets `[data-theme]` on the root element.
- History `☰` toggle: opens/closes `HistoryDrawer`.

### Editor pane (left on desktop)
- `FileDrop` wraps `CodeEditor`: a full-pane overlay that responds to `dragover`/`drop` and exposes an **Import** button (`<input type="file" accept=".json,application/json">`). Accepted file text is read and loaded into the editor.
- `CodeEditor` (CodeMirror 6): line-number gutter, JSON language mode, `@codemirror/lint` linter producing squiggles + a gutter marker at the error line. Read/writes text via the store; on doc-change it pushes the new text into `rawInput`.
- `Toolbar` beneath the editor: **Parse**, **Format**, **Minify**, **Auto Fix**, **Clear**, **Import**, and **ConvertMenu**.

### Output pane (right on desktop)
- `OutputPanel`: **Text / Tree** toggle.
  - **Text** → `TextView`: highlighted `<pre>` rendered from `lib/highlight.ts`.
  - **Tree** → `TreeView`: the existing collapsible tree, ported to React. Clicking any key node selects it, populates `selectedPath`, and (below) feeds `PathFinder`.
- `PathFinder` renders beneath the tree (same as today): read-only **JSON path** and **PHP array path** fields each with a Copy button, plus **find-by-JSON-path** and **find-by-PHP-path** search inputs and a result preview.

### History drawer (right slide-in)
- Lists past parses: relative timestamp, truncated preview, click-to-load (loads into editor + parses), per-item delete, and **Clear All**. Backed by `localStorage`, capped at 50 items.

### ConvertMenu
- Dropdown with four actions: **To YAML**, **To CSV**, **From YAML**, **From CSV**.
- "To" actions render the converted output in the output area (with **Copy** and **Load to editor**).
- "From" actions parse the editor content as YAML/CSV and load the resulting JSON into the editor (formatted).

---

## 5. State & Data Flow

A single Zustand store holds all app state and the actions that mutate it:

```ts
type State = {
  rawInput: string;                       // mirror of editor text (CM is source of truth)
  parsed: unknown | null;                 // last successfully parsed value
  parseError: ParseError | null;          // { message, pos, line, col }
  view: 'text' | 'tree';
  history: HistoryItem[];
  theme: ThemeName;                       // 'midnight' | 'daylight' | 'aurora'
  historyOpen: boolean;
  selectedPath: { jsonPath: string; phpPath: string; value: unknown } | null;
};
```

Key flows:

1. **Typing** → CodeMirror `updateListener` pushes text to `rawInput`; a debounced parse runs the linter. On parse failure, map the V8 error `position` → `{line, col}` → emit a CM `Diagnostic` (warning severity) so the squiggle + gutter marker appear. A **jump-to-error** control (button + keyboard shortcut) scrolls CM to the diagnostic's line.
2. **Parse** → `lib/json.parse` → set `parsed`, render Text or Tree, push to history.
3. **Format / Minify** → transform `rawInput`, write the result back into CM via a dispatched transaction (not via React state), then save to history.
4. **Auto Fix** → `lib/autofix.attemptAutoFix`; if the result parses, write it into CM and save to history; otherwise surface the reason.
5. **Tree click** → compute JSON + PHP path from the node's path array, set `selectedPath`, show the value preview.
6. **Find-by-path** → resolve the path against `parsed`; on hit, set `selectedPath`, highlight the matching tree node, and scroll it into view.
7. **Convert (to)** → produce YAML/CSV from `parsed`, show in output area with Copy / Load-to-editor.
8. **Convert (from)** → parse editor text as YAML/CSV → load formatted JSON into CM.
9. **File import** → read file → load into CM → auto-parse.
10. **History load/delete/clear** → operate on `localStorage` via `lib/history`, refresh the drawer.

**CodeMirror integration rule:** CM is the source of truth for editor text. Components read text from CM's API and write transforms back as transactions. `rawInput` in the store is a convenience mirror for logic that needs the current text (linting, toolbar transforms); it is never used to *drive* CM content during normal typing, which avoids editor/React desync.

---

## 6. Themes

Three theme token maps in `theme/themes.ts` define semantic tokens with concrete values:

- Surfaces: `--bg`, `--panel`, `--panel-2`, `--border`
- Text: `--text`, `--text-muted`, `--text-faint`
- Accent: `--accent`, `--accent-contrast`, `--accent-soft`
- Status: `--success`, `--error`, `--warning`
- JSON tokens: `--tok-key`, `--tok-string`, `--tok-number`, `--tok-boolean`, `--tok-null`

Concrete palettes (from the brainstorming mockups):

- **Midnight** — deep slate canvas (`#0b1020`/`#0f172a`), neon indigo accent (`#6366f1`), light text (`#e2e8f0`); token colors: key `#f47fff`, string `#4ade80`, number `#60a5fa`, boolean `#fbbf24`, null `#94a3b8`.
- **Daylight** — soft gray canvas (`#eef2f7`), white panels with crisp borders, indigo accent (`#6366f1`), dark text (`#0f172a`); token colors: key `#be185d`, string `#15803d`, number `#2563eb`, boolean `#b45309`, null `#64748b`.
- **Aurora** — vibrant gradient backdrop (`linear-gradient(135deg,#7c3aed,#db2777 55%,#0ea5e9)`), translucent frosted panels (`rgba(255,255,255,.12)` + `backdrop-filter: blur`), white text, pink accent (`#db2777`); token colors tuned for contrast on glass.

Mechanics:
- Applied as CSS variables under `[data-theme="midnight|daylight|aurora"]` on the document root.
- `index.css` defines a small semantic class layer (`.surface`, `.surface-2`, `.text-muted`, `.btn-accent`, `.input`, `.token-key`, …) backed by these variables, so component JSX stays theme-agnostic.
- `theme/cmTheme.ts` builds a CodeMirror `Extension` from the same token map, so the editor re-themes with everything else.
- Active theme persisted in `localStorage` (`jsonParser.theme`); **default `midnight`**.

---

## 7. Responsive Behavior

- **≥1024px (desktop):** two panes side-by-side (Editor | Output), each fills available height. History opens as a right slide-in drawer overlaying content.
- **768–1023px (tablet):** panes side-by-side but narrower; history drawer overlays with a backdrop.
- **<768px (mobile):** single column — Editor stacked above Output. Toolbar wraps. History drawer becomes a full-screen overlay. CodeMirror uses a sensible min-height and fills its pane.

Implemented with Tailwind responsive utilities; the drawer uses a fixed/overlay panel with a transform transition.

---

## 8. Ported Logic (behavior preserved)

The following behaviors are ported from the existing `script.js` into `lib/`, with the same semantics, improved and isolated:

- **Auto-fix** (`lib/autofix.ts`): single→double quotes, unquoted keys, trailing-comma removal, missing-comma insertion, value quoting, missing closing brace/bracket balancing. Each fixer retained; tests pin each behavior.
- **Path utilities** (`lib/paths.ts`): `getValueByPath`, dot-notation JSON path, PHP array path (`$response['k'][0]`), bracket notation, and the reverse parse of a PHP path back to a key array.
- **Syntax highlight** (`lib/highlight.ts`): HTML-escape then token-wrap keys/strings/numbers/booleans/null. (Used for the Text output `<pre>`; the editor itself uses CodeMirror's highlighting.)
- **History** (`lib/history.ts`): same item shape (`id`, `data`, `timestamp`, `preview`), 50-item cap, relative-time formatting.
- **Live error detection:** retained as the CodeMirror linter; position parsing reused.

---

## 9. Error Handling

- **Parse errors:** caught → mapped to `{message, pos, line, col}` → CM diagnostic (squiggle + gutter marker) + a status banner + an output-area message.
- **Auto-fix failure:** "Unable to auto-fix JSON" with the underlying parse error message.
- **Clipboard:** `navigator.clipboard.writeText` with a `.catch` fallback to a `document.execCommand('copy')` legacy path; final fallback is a notice.
- **File import:** validate extension/MIME, guard `FileReader` errors, reject empty reads, and parse on load — non-JSON shows a toast.
- **Conversion:** guard inputs — CSV export requires an array of flat-ish objects (nested values are JSON-stringified; non-array root is rejected with an explanatory notice). YAML round-trips via `js-yaml` `safeLoad`/`dump`.
- **localStorage:** all reads/writes wrapped in try/catch; if unavailable or over quota, history is disabled with a one-time notice and the app otherwise functions.

---

## 10. Testing

**Vitest unit tests** for every `lib/*` module:
- `json.ts` — format (indent), minify, validate (valid/invalid, empty).
- `autofix.ts` — one case per fixer (single quotes, unquoted keys, trailing commas, missing commas, value quoting, unbalanced brackets) plus an already-valid passthrough and an unfixable case.
- `paths.ts` — `getValueByPath` (nested, arrays, missing keys), JSON↔PHP path round-trips, PHP-path parse back to keys, numeric-index handling.
- `convert.ts` — YAML round-trip; CSV export of an array of objects; CSV import back to JSON; nested-value stringification; rejection of non-tabular input for CSV export.
- `highlight.ts` — HTML escaping (`&`, `<`, `>`) and correct token class assignment per JSON type.
- `history.ts` — add/cap-at-50/delete/clear, relative-time formatting, malformed-storage resilience.

**React Testing Library** interaction tests:
- ThemeSwitcher applies `[data-theme]` and persists to `localStorage`.
- Toolbar buttons invoke the correct transforms and update the editor/output.
- TreeView node click populates `PathFinder` paths.
- Find-by-path resolves and highlights.
- HistoryDrawer load/delete/clear-all.
- FileDrop loads file content into the editor.

---

## 11. Migration / Deploy

- New Vite project initialized at the repo root (existing `index.html`, `script.js`, `style.css` remain until cutover, then replaced by the built `dist/`).
- `npm run build` → `dist/`; deploy as static files (GitHub Pages / any static host), matching the current hosting model.
- The existing three files are removed at cutover; README updated with dev/build instructions.

---

## 12. Open Items Resolved During Brainstorming

- Tech approach: **React + Tailwind full rewrite** (chosen over vanilla CSS rewrite or Tailwind-CDN).
- Visual direction: **three switchable themes**, Midnight default (chosen over picking a single aesthetic).
- Layout: **two-pane + history drawer** (chosen over three-pane or vertical split).
- Editor: **CodeMirror 6** (chosen over a custom textarea overlay) to deliver line numbers + jump-to-error natively.
- Features: preserve all existing + add line-numbers/jump-to-error, file import (drag & drop), and JSON ⇄ YAML/CSV conversion.
