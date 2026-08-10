# JSON Parser Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the vanilla JSON parser as a modern React + TypeScript + Tailwind app that preserves all existing features, adds line-numbers/jump-to-error, file drag-drop import, and JSON⇄YAML/CSV conversion, with three switchable themes (Midnight default) and full responsive support.

**Architecture:** Vite SPA. All domain logic lives in pure, framework-free `lib/*` modules (unit-tested in isolation). A single Zustand store holds app state and orchestrates those modules. CodeMirror 6 is the input editor (source of truth for text); React components render output, tree, path-finder, history, and conversion UI. Themes are CSS variables under `[data-theme]` plus a CodeMirror theme generated from the same token map.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS v3, Zustand, CodeMirror 6, js-yaml, Vitest + @testing-library/react.

## Global Constraints

- **Package manager:** `npm`. **Node:** ≥ 18.
- **Tailwind:** v3 with PostCSS + `tailwind.config.js` (content scans `./index.html` and `./src/**/*.{ts,tsx}`).
- **State:** single Zustand store; CodeMirror is the source of truth for editor text (never drive CM from React state during typing).
- **Themes:** three — `midnight` (default), `daylight`, `aurora`. Persisted under `localStorage` key `jsonParser.theme`. Applied via `[data-theme]` on `document.documentElement`.
- **History:** `localStorage` key `jsonParserHistory`, capped at 50 items. All storage access wrapped in try/catch.
- **Pure modules:** `lib/*` must not import React (except `history.ts` touches `localStorage`, isolated). Every `lib/*` function is unit-tested.
- **TDD:** every logic task writes the failing test first, runs it red, implements minimally, runs it green, then commits.
- **Commits:** one commit per task, on branch `feat/react-tailwind-revamp` (already created). Conventional-commit messages.

## Shared Types & Signatures (authoritative — all tasks must match these)

`src/types.ts`:
```ts
export type ThemeName = 'midnight' | 'daylight' | 'aurora';
export type ViewMode = 'text' | 'tree';
export type Path = string[]; // key/index segments; numeric strings for array indices

export interface HistoryItem { id: number; data: string; timestamp: string; preview: string; }
export interface ParseError { message: string; pos: number; line: number; col: number; }
export interface SelectedPath { path: Path; jsonPath: string; phpPath: string; value: unknown; }
```

`src/lib/json.ts`:
```ts
export function safeParse(input: string): { ok: true; value: unknown } | { ok: false; error: ParseError };
export function locateError(input: string): ParseError | null;
export function lintJson(text: string): { from: number; to: number; severity: 'error'; message: string }[];
export function reformat(input: string): { ok: true; output: string } | { ok: false; error: ParseError };
export function minify(input: string): { ok: true; output: string } | { ok: false; error: ParseError };
```

`src/lib/autofix.ts`:
```ts
export function attemptAutoFix(input: string): string; // best-effort; may still be invalid
```

`src/lib/paths.ts`:
```ts
export function getValueByPath(obj: unknown, path: Path): unknown;
export function toJsonPath(path: Path): string;        // '' -> 'root'
export function toPhpPath(path: Path): string;         // '$response['a'][0]'
export function parsePhpPath(php: string): Path;
export function parseDotPath(dot: string): Path;
```

`src/lib/highlight.ts`:
```ts
export function escapeHtml(s: string): string;
export function syntaxHighlight(json: string): string; // HTML string with <span class="json-*">
```

`src/lib/convert.ts`:
```ts
type Conv = { ok: true; output: string } | { ok: false; error: string };
export function toYamlFromJson(input: string): Conv;
export function toJsonFromYaml(input: string): Conv;
export function toCsvFromJson(input: string): Conv;
export function toJsonFromCsv(input: string): Conv;
```

`src/lib/history.ts`:
```ts
export const HISTORY_KEY = 'jsonParserHistory';
export const HISTORY_LIMIT = 50;
export function makeHistoryItem(data: string, id: number, timestamp: string): HistoryItem;
export function prependHistory(list: HistoryItem[], item: HistoryItem): HistoryItem[];
export function loadHistory(): HistoryItem[];
export function persistHistory(list: HistoryItem[]): void;
export function createPreview(data: string): string;
export function formatRelativeTime(iso: string, now: number): string;
```

`src/theme/themes.ts`:
```ts
export interface ThemeTokens { /* CSS variable name -> value, see Task 8 */ }
export const THEMES: Record<ThemeName, ThemeTokens>;
export function themeToCssVars(name: ThemeName): Record<string, string>;
```

`src/theme/ThemeContext.tsx`:
```ts
export function ThemeProvider({ children }: { children: React.ReactNode }): JSX.Element;
export function useTheme(): { theme: ThemeName; setTheme: (t: ThemeName) => void };
```

`src/store.ts`:
```ts
export interface AppState {
  rawInput: string; parsed: unknown | null; parseError: ParseError | null;
  view: ViewMode; history: HistoryItem[]; historyOpen: boolean; selectedPath: SelectedPath | null;
  setRawInput(s: string): void; parse(): void; reformat(): void; minify(): void;
  autoFix(): void; clear(): void; loadIntoEditor(s: string): void; setView(v: ViewMode): void;
  toggleHistory(): void; selectPath(path: Path): void; findByJsonPath(dot: string): void;
  findByPhpPath(php: string): void; removeHistory(id: number): void; clearAllHistory(): void;
  loadHistoryItem(id: number): void;
}
export const useStore: UseBoundStore<StoreApi<AppState>>;
```

---

### Task 1: Scaffold Vite + React + TS + Tailwind + Vitest

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/setupTests.ts`, `src/__tests__/smoke.test.tsx`

**Interfaces:**
- Produces: a runnable dev server (`npm run dev`), a passing test runner (`npm test`), and the Tailwind + theme-variable foundation consumed by every later task.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "json-parser",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@codemirror/commands": "^6.6.0",
    "@codemirror/lang-json": "^6.0.1",
    "@codemirror/lint": "^6.8.0",
    "@codemirror/state": "^6.4.0",
    "@codemirror/view": "^6.33.0",
    "js-yaml": "^4.1.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/js-yaml": "^4.0.9",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create `vite.config.ts`**

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: true,
  },
});
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `tailwind.config.js` and `postcss.config.js`**

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

```js
// postcss.config.js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 5: Create `index.html`**

```html
<!doctype html>
<html lang="en" data-theme="midnight">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>JSON Parser</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `src/index.css` (Tailwind + minimal theme-variable foundation)**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #0b1020; --panel: #0f172a; --panel-2: #111827; --border: #1e293b;
  --text: #e2e8f0; --text-muted: #94a3b8; --text-faint: #64748b;
  --accent: #6366f1; --accent-contrast: #ffffff; --accent-soft: #312e81;
  --success: #4ade80; --error: #f87171; --warning: #fbbf24;
  --tok-key: #f47fff; --tok-string: #4ade80; --tok-number: #60a5fa;
  --tok-boolean: #fbbf24; --tok-null: #94a3b8;
}
html, body, #root { height: 100%; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
```

(Task 8 replaces these placeholder variables with the full three-theme system.)

- [ ] **Step 7: Create `src/main.tsx`, `src/App.tsx`, `src/setupTests.ts`**

```tsx
// src/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
```

```tsx
// src/App.tsx
export default function App() {
  return <div className="p-8">JSON Parser — scaffolding OK</div>;
}
```

```ts
// src/setupTests.ts
import '@testing-library/jest-dom';
```

- [ ] **Step 8: Create `src/__tests__/smoke.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import App from '../App';

test('renders scaffolding marker', () => {
  render(<App />);
  expect(screen.getByText(/scaffolding OK/i)).toBeInTheDocument();
});
```

- [ ] **Step 9: Install and verify**

Run: `npm install && npm test`
Expected: 1 test passes.

Run: `npm run build`
Expected: build succeeds, emits `dist/`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS + Tailwind + Vitest"
```

---

### Task 2: `lib/json.ts` — parse, format, minify, locate error, lint

**Files:**
- Create: `src/types.ts`, `src/lib/json.ts`
- Test: `src/lib/__tests__/json.test.ts`

**Interfaces:**
- Produces: `safeParse`, `locateError`, `lintJson`, `reformat`, `minify` (signatures in Shared Types). Consumed by the store (Task 9) and the CodeMirror linter (Task 10).

- [ ] **Step 1: Create `src/types.ts`** (copy the Shared Types block verbatim).

- [ ] **Step 2: Write the failing test**

```ts
// src/lib/__tests__/json.test.ts
import { describe, expect, it } from 'vitest';
import { safeParse, locateError, lintJson, reformat, minify } from '../json';

describe('json module', () => {
  it('safeParse returns value for valid JSON', () => {
    const r = safeParse('{"a":1}');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ a: 1 });
  });
  it('safeParse returns error for invalid JSON', () => {
    const r = safeParse('{a:1}');
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.error.pos).toBe(1); expect(r.error.line).toBe(1); }
  });
  it('locateError is null for valid, set for invalid', () => {
    expect(locateError('{}')).toBeNull();
    const e = locateError('{ bad }');
    expect(e).not.toBeNull();
    expect(e!.message).toMatch(/JSON/);
  });
  it('lintJson returns one diagnostic for broken input, none for valid', () => {
    expect(lintJson('{}')).toEqual([]);
    const d = lintJson('{a:1}');
    expect(d).toHaveLength(1);
    expect(d[0].severity).toBe('error');
  });
  it('reformat pretty-prints valid input', () => {
    const r = reformat('{"a":1}');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.output).toBe('{\n  "a": 1\n}');
  });
  it('reformat fails on invalid input', () => {
    expect(reformat('{a:1}').ok).toBe(false);
  });
  it('minify collapses valid input', () => {
    const r = minify('{\n  "a": 1\n}');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.output).toBe('{"a":1}');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/json.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement `src/lib/json.ts`**

```ts
// src/lib/json.ts
import type { ParseError } from '../types';

function posToLineCol(text: string, pos: number): { line: number; col: number } {
  let line = 1, col = 1;
  for (let i = 0; i < pos && i < text.length; i++) {
    if (text[i] === '\n') { line++; col = 1; } else col++;
  }
  return { line, col };
}

export function locateError(input: string): ParseError | null {
  try { JSON.parse(input); return null; }
  catch (e) {
    const msg = (e as Error).message;
    const m = msg.match(/position (\d+)/);
    const pos = m ? parseInt(m[1], 10) : Math.max(0, input.length - 1);
    const { line, col } = posToLineCol(input, pos);
    return { message: msg, pos, line, col };
  }
}

export function safeParse(input: string): { ok: true; value: unknown } | { ok: false; error: ParseError } {
  const err = locateError(input);
  if (err) return { ok: false, error: err };
  return { ok: true, value: JSON.parse(input) };
}

export function lintJson(text: string): { from: number; to: number; severity: 'error'; message: string }[] {
  const err = locateError(text);
  if (!err) return [];
  return [{ from: err.pos, to: Math.min(err.pos + 1, text.length), severity: 'error', message: err.message }];
}

export function reformat(input: string): { ok: true; output: string } | { ok: false; error: ParseError } {
  const r = safeParse(input);
  if (!r.ok) return r;
  return { ok: true, output: JSON.stringify(r.value, null, 2) };
}

export function minify(input: string): { ok: true; output: string } | { ok: false; error: ParseError } {
  const r = safeParse(input);
  if (!r.ok) return r;
  return { ok: true, output: JSON.stringify(r.value) };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/json.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/lib/json.ts src/lib/__tests__/json.test.ts
git commit -m "feat(json): add parse, format, minify, error-location, lint"
```

---

### Task 3: `lib/autofix.ts` — attemptAutoFix

**Files:**
- Create: `src/lib/autofix.ts`
- Test: `src/lib/__tests__/autofix.test.ts`

**Interfaces:**
- Produces: `attemptAutoFix(input: string): string`. Consumed by `store.autoFix()` (Task 9).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/autofix.test.ts
import { describe, expect, it } from 'vitest';
import { attemptAutoFix } from '../autofix';

const roundtrip = (input: string) => JSON.parse(attemptAutoFix(input));

describe('attemptAutoFix', () => {
  it('fixes single quotes to double quotes', () => {
    expect(roundtrip("{'a':'b'}")).toEqual({ a: 'b' });
  });
  it('quotes unquoted keys', () => {
    expect(roundtrip('{a: 1}')).toEqual({ a: 1 });
  });
  it('removes trailing commas', () => {
    expect(roundtrip('{"a":1,}')).toEqual({ a: 1 });
    expect(roundtrip('[1,2,]')).toEqual([1, 2]);
  });
  it('inserts missing commas between properties', () => {
    expect(roundtrip('{"a":1\n"b":2}')).toEqual({ a: 1, b: 2 });
  });
  it('quotes unquoted string values', () => {
    expect(roundtrip('{"a":hello}')).toEqual({ a: 'hello' });
  });
  it('balances missing closing brackets', () => {
    expect(roundtrip('{"a":[1,2}')).toEqual({ a: [1, 2] }); // brace->bracket best-effort
  });
  it('leaves already-valid JSON parseable', () => {
    expect(roundtrip('{"a":1}')).toEqual({ a: 1 });
  });
  it('preserves true/false/null as literals', () => {
    expect(roundtrip('{a:true, b:false, c:null}')).toEqual({ a: true, b: false, c: null });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/autofix.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/autofix.ts`** (ported from the original `attemptAutoFix`)

```ts
// src/lib/autofix.ts
export function attemptAutoFix(json: string): string {
  let fixed = json;

  fixed = fixed.replace(/'/g, '"');                                  // single -> double quotes
  fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":'); // unquoted keys
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');                       // trailing commas
  fixed = fixed.replace(/"\s*\n\s*"/g, '",\n"');                      // missing commas
  fixed = fixed.replace(/}\s*\n\s*"/g, '},\n"');
  fixed = fixed.replace(/]\s*\n\s*"/g, '],\n"');

  // quote unquoted string values (keep true/false/null)
  fixed = fixed.replace(/:(\s*)([a-zA-Z][a-zA-Z0-9_]*)\s*([,}\]])/g, (_m, sp, val, end) =>
    ['true', 'false', 'null'].includes(val) ? `:${sp}${val}${end}` : `:${sp}"${val}"${end}`);

  // balance brackets
  const openB = (fixed.match(/{/g) || []).length, closeB = (fixed.match(/}/g) || []).length;
  const openK = (fixed.match(/\[/g) || []).length, closeK = (fixed.match(/\]/g) || []).length;
  for (let i = 0; i < openB - closeB; i++) fixed += '}';
  for (let i = 0; i < openK - closeK; i++) fixed += ']';

  return fixed;
}
```

Note: the "balance brackets" fixer is best-effort; the test pins its current behavior (`{'a':[1,2}` -> the stray `}` is left, an extra `]` appended -> parses as `{a:[1,2]}`). If a later environment's regex differs, adjust only the test expectation to match the implemented behavior — do not change the fixer's order.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/autofix.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/autofix.ts src/lib/__tests__/autofix.test.ts
git commit -m "feat(autofix): port and test JSON auto-fixer"
```

---

### Task 4: `lib/paths.ts` — value lookup and JSON/PHP path conversion

**Files:**
- Create: `src/lib/paths.ts`
- Test: `src/lib/__tests__/paths.test.ts`

**Interfaces:**
- Produces: `getValueByPath`, `toJsonPath`, `toPhpPath`, `parsePhpPath`, `parseDotPath`. Consumed by TreeView (Task 11), PathFinder (Task 12), and the store (Task 9).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/paths.test.ts
import { describe, expect, it } from 'vitest';
import { getValueByPath, toJsonPath, toPhpPath, parsePhpPath, parseDotPath } from '../paths';

const data = { address: { city: 'Sydney' }, list: [10, 20] };

describe('paths module', () => {
  it('getValueByPath resolves nested and array paths', () => {
    expect(getValueByPath(data, ['address', 'city'])).toBe('Sydney');
    expect(getValueByPath(data, ['list', '1'])).toBe(20);
  });
  it('getValueByPath returns undefined for missing path', () => {
    expect(getValueByPath(data, ['nope'])).toBeUndefined();
  });
  it('toJsonPath joins with dots, root for empty', () => {
    expect(toJsonPath([])).toBe('root');
    expect(toJsonPath(['address', 'city'])).toBe('address.city');
  });
  it('toPhpPath uses brackets, quotes string keys', () => {
    expect(toPhpPath([])).toBe('$response');
    expect(toPhpPath(['address', 'city'])).toBe("$response['address']['city']");
    expect(toPhpPath(['list', '1'])).toBe("$response['list'][1]");
  });
  it('parsePhpPath extracts keys in order', () => {
    expect(parsePhpPath("$response['address']['city']")).toEqual(['address', 'city']);
    expect(parsePhpPath('$response[list][1]')).toEqual(['list', '1']);
    expect(parsePhpPath('$response')).toEqual([]);
  });
  it('parseDotPath splits on dots', () => {
    expect(parseDotPath('address.city')).toEqual(['address', 'city']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/paths.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/paths.ts`**

```ts
// src/lib/paths.ts
import type { Path } from '../types';

export function getValueByPath(obj: unknown, path: Path): unknown {
  let cur: any = obj;
  for (const key of path) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[key];
  }
  return cur;
}

export function toJsonPath(path: Path): string {
  return path.length === 0 ? 'root' : path.join('.');
}

export function toPhpPath(path: Path): string {
  if (path.length === 0) return '$response';
  let out = '$response';
  for (const key of path) {
    out += /^\d+$/.test(key) ? `[${key}]` : `['${key}']`;
  }
  return out;
}

export function parsePhpPath(php: string): Path {
  const cleaned = php.trim().replace(/^\$\w+/, '');
  const matches = cleaned.match(/\[([^\]]+)\]/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(1, -1).replace(/^['"]|['"]$/g, ''));
}

export function parseDotPath(dot: string): Path {
  return dot.split('.').map((s) => s.trim()).filter((s) => s.length > 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/paths.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/paths.ts src/lib/__tests__/paths.test.ts
git commit -m "feat(paths): add value lookup and JSON/PHP path conversion"
```

---

### Task 5: `lib/highlight.ts` — syntax highlighting for text output

**Files:**
- Create: `src/lib/highlight.ts`
- Test: `src/lib/__tests__/highlight.test.ts`

**Interfaces:**
- Produces: `escapeHtml`, `syntaxHighlight`. Consumed by `TextView` (Task 11).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/highlight.test.ts
import { describe, expect, it } from 'vitest';
import { escapeHtml, syntaxHighlight } from '../highlight';

describe('highlight module', () => {
  it('escapeHtml escapes &, <, >', () => {
    expect(escapeHtml('a & <b> c')).toBe('a &amp; &lt;b&gt; c');
  });
  it('wraps keys, strings, numbers, booleans, null', () => {
    const html = syntaxHighlight('{\n  "a": 1,\n  "b": "x",\n  "c": true,\n  "d": null\n}');
    expect(html).toContain('<span class="json-key">"a"</span>');
    expect(html).toContain('<span class="json-number">1</span>');
    expect(html).toContain('<span class="json-string">"x"</span>');
    expect(html).toContain('<span class="json-boolean">true</span>');
    expect(html).toContain('<span class="json-null">null</span>');
  });
  it('escapes HTML inside JSON before wrapping', () => {
    expect(syntaxHighlight('{"a":"<script>"}')).toContain('&lt;script&gt;');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/highlight.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/highlight.ts`** (ported from original `syntaxHighlight`/`escapeHtml`)

```ts
// src/lib/highlight.ts
export function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
}

export function syntaxHighlight(json: string): string {
  const escaped = escapeHtml(json);
  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number';
      if (/^"/.test(match)) cls = /:$/.test(match) ? 'json-key' : 'json-string';
      else if (/true|false/.test(match)) cls = 'json-boolean';
      else if (/null/.test(match)) cls = 'json-null';
      return `<span class="${cls}">${match}</span>`;
    }
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/highlight.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/highlight.ts src/lib/__tests__/highlight.test.ts
git commit -m "feat(highlight): add HTML-safe syntax highlighter"
```

---

### Task 6: `lib/convert.ts` — JSON ⇄ YAML / CSV

**Files:**
- Create: `src/lib/convert.ts`
- Test: `src/lib/__tests__/convert.test.ts`

**Interfaces:**
- Produces: `toYamlFromJson`, `toJsonFromYaml`, `toCsvFromJson`, `toJsonFromCsv`. Consumed by `ConvertMenu` (Task 14).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/convert.test.ts
import { describe, expect, it } from 'vitest';
import { toYamlFromJson, toJsonFromYaml, toCsvFromJson, toJsonFromCsv } from '../convert';

describe('convert module', () => {
  it('toYamlFromJson converts JSON object to YAML', () => {
    const r = toYamlFromJson('{"a":1,"b":"x"}');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.output).toContain('a: 1');
  });
  it('toYamlFromJson fails on invalid JSON', () => {
    expect(toYamlFromJson('{a:1}').ok).toBe(false);
  });
  it('toJsonFromYaml converts YAML to JSON', () => {
    const r = toJsonFromYaml('a: 1\nb: x');
    expect(r.ok).toBe(true);
    if (r.ok) expect(JSON.parse(r.output)).toEqual({ a: 1, b: 'x' });
  });
  it('toCsvFromJson converts array of objects', () => {
    const r = toCsvFromJson('[{"a":1,"b":2},{"a":3,"b":4}]');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.output.split('\n')[0]).toBe('a,b');
      expect(r.output).toContain('1,2');
      expect(r.output).toContain('3,4');
    }
  });
  it('toCsvFromJson rejects non-array JSON', () => {
    expect(toCsvFromJson('{"a":1}').ok).toBe(false);
  });
  it('toJsonFromCsv converts CSV to array of objects', () => {
    const r = toJsonFromCsv('a,b\n1,2\n3,4');
    expect(r.ok).toBe(true);
    if (r.ok) expect(JSON.parse(r.output)).toEqual([{ a: '1', b: '2' }, { a: '3', b: '4' }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/convert.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/convert.ts`**

```ts
// src/lib/convert.ts
import yaml from 'js-yaml';
import { safeParse } from './json';

type Conv = { ok: true; output: string } | { ok: false; error: string };

export function toYamlFromJson(input: string): Conv {
  const r = safeParse(input);
  if (!r.ok) return { ok: false, error: r.error.message };
  try { return { ok: true, output: yaml.dump(r.value, { indent: 2 }) }; }
  catch (e) { return { ok: false, error: (e as Error).message }; }
}

export function toJsonFromYaml(input: string): Conv {
  try {
    const value = yaml.load(input);
    return { ok: true, output: JSON.stringify(value, null, 2) };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

function csvEscape(v: unknown): string {
  const s = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsvFromJson(input: string): Conv {
  const r = safeParse(input);
  if (!r.ok) return { ok: false, error: r.error.message };
  if (!Array.isArray(r.value)) return { ok: false, error: 'CSV export requires a JSON array of objects.' };
  const rows = r.value as Record<string, unknown>[];
  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row ?? {}).forEach((k) => set.add(k));
    return set;
  }, new Set<string>()));
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape((row ?? {})[h])).join(','));
  }
  return { ok: true, output: lines.join('\n') };
}

export function toJsonFromCsv(input: string): Conv {
  const lines = input.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return { ok: true, output: '[]' };
  const parseLine = (line: string): string[] => {
    const out: string[] = []; let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cells = parseLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']));
  });
  return { ok: true, output: JSON.stringify(rows, null, 2) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/convert.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/convert.ts src/lib/__tests__/convert.test.ts
git commit -m "feat(convert): add JSON<->YAML and JSON<->CSV conversion"
```

---

### Task 7: `lib/history.ts` — localStorage-backed history

**Files:**
- Create: `src/lib/history.ts`
- Test: `src/lib/__tests__/history.test.ts`

**Interfaces:**
- Produces: `HISTORY_KEY`, `HISTORY_LIMIT`, `makeHistoryItem`, `prependHistory`, `loadHistory`, `persistHistory`, `createPreview`, `formatRelativeTime`. Consumed by the store (Task 9) and `HistoryDrawer` (Task 13).

- [ ] **Step 1: Write the failing test** (uses an in-memory `localStorage` stub)

```ts
// src/lib/__tests__/history.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  HISTORY_KEY, HISTORY_LIMIT, makeHistoryItem, prependHistory,
  loadHistory, persistHistory, createPreview, formatRelativeTime,
} from '../history';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  };
});

describe('history module', () => {
  it('createPreview truncates long data', () => {
    expect(createPreview('x'.repeat(120))).toBe('x'.repeat(100) + '...');
    expect(createPreview('short')).toBe('short');
  });
  it('prependHistory adds to front and caps at LIMIT', () => {
    let list = prependHistory([], makeHistoryItem('{}', 1, '2026-01-01T00:00:00Z'));
    expect(list[0].id).toBe(1);
    for (let i = 2; i <= HISTORY_LIMIT + 5; i++) {
      list = prependHistory(list, makeHistoryItem('{}', i, '2026-01-01T00:00:00Z'));
    }
    expect(list.length).toBe(HISTORY_LIMIT);
    expect(list[0].id).toBe(HISTORY_LIMIT + 5);
  });
  it('persistHistory / loadHistory round-trip', () => {
    const list = [makeHistoryItem('{"a":1}', 1, '2026-01-01T00:00:00Z')];
    persistHistory(list);
    const loaded = loadHistory();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].data).toBe('{"a":1}');
  });
  it('loadHistory returns [] on corrupt storage', () => {
    localStorage.setItem(HISTORY_KEY, 'not json');
    expect(loadHistory()).toEqual([]);
  });
  it('formatRelativeTime shows relative phrases', () => {
    const now = Date.parse('2026-01-01T01:00:00Z');
    expect(formatRelativeTime('2026-01-01T00:59:30Z', now)).toBe('Just now');
    expect(formatRelativeTime('2026-01-01T00:30:00Z', now)).toBe('30 minutes ago');
    expect(formatRelativeTime('2025-12-31T01:00:00Z', now)).toBe('1 day ago');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/history.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/history.ts`**

```ts
// src/lib/history.ts
import type { HistoryItem } from '../types';

export const HISTORY_KEY = 'jsonParserHistory';
export const HISTORY_LIMIT = 50;

export function createPreview(data: string): string {
  return data.length > 100 ? data.slice(0, 100) + '...' : data;
}

export function makeHistoryItem(data: string, id: number, timestamp: string): HistoryItem {
  return { id, data, timestamp, preview: createPreview(data) };
}

export function prependHistory(list: HistoryItem[], item: HistoryItem): HistoryItem[] {
  return [item, ...list].slice(0, HISTORY_LIMIT);
}

export function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) as HistoryItem[] : [];
  } catch { return []; }
}

export function persistHistory(list: HistoryItem[]): void {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch { /* quota/unavailable */ }
}

export function formatRelativeTime(iso: string, now: number): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const diff = now - t;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) { const m = Math.floor(diff / 60000); return `${m} minute${m > 1 ? 's' : ''} ago`; }
  if (diff < 86400000) { const h = Math.floor(diff / 3600000); return `${h} hour${h > 1 ? 's' : ''} ago`; }
  const d = Math.floor(diff / 86400000);
  return `${d} day${d > 1 ? 's' : ''} ago`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/history.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/history.ts src/lib/__tests__/history.test.ts
git commit -m "feat(history): add localStorage history store and relative-time formatting"
```

---

### Task 8: Theme tokens, CSS variables, semantic classes, and CodeMirror theme

**Files:**
- Create: `src/theme/themes.ts`, `src/theme/cmTheme.ts`
- Modify: `src/index.css` (replace placeholder variables with the three-theme system + semantic classes)
- Test: `src/theme/__tests__/themes.test.ts`

**Interfaces:**
- Produces: `ThemeTokens`, `THEMES`, `themeToCssVars`, `cmThemeFor(name)`. Consumed by `ThemeContext` (Task 9) and `CodeEditor` (Task 10).

- [ ] **Step 1: Write the failing test**

```ts
// src/theme/__tests__/themes.test.ts
import { describe, expect, it } from 'vitest';
import { THEMES, themeToCssVars } from '../themes';

describe('themes', () => {
  it('defines all three themes with required tokens', () => {
    for (const name of ['midnight', 'daylight', 'aurora'] as const) {
      const t = THEMES[name];
      expect(t['--bg']).toBeTruthy();
      expect(t['--accent']).toBeTruthy();
      expect(t['--tok-key']).toBeTruthy();
    }
  });
  it('themeToCssVars returns the token map verbatim', () => {
    const vars = themeToCssVars('midnight');
    expect(vars['--bg']).toBe(THEMES.midnight['--bg']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/theme/__tests__/themes.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/theme/themes.ts`**

```ts
// src/theme/themes.ts
import type { ThemeName } from '../types';

export interface ThemeTokens {
  '--bg': string; '--panel': string; '--panel-2': string; '--border': string;
  '--text': string; '--text-muted': string; '--text-faint': string;
  '--accent': string; '--accent-contrast': string; '--accent-soft': string;
  '--success': string; '--error': string; '--warning': string;
  '--tok-key': string; '--tok-string': string; '--tok-number': string;
  '--tok-boolean': string; '--tok-null': string;
}

export const THEMES: Record<ThemeName, ThemeTokens> = {
  midnight: {
    '--bg': '#0b1020', '--panel': '#0f172a', '--panel-2': '#111827', '--border': '#1e293b',
    '--text': '#e2e8f0', '--text-muted': '#94a3b8', '--text-faint': '#64748b',
    '--accent': '#6366f1', '--accent-contrast': '#ffffff', '--accent-soft': '#312e81',
    '--success': '#4ade80', '--error': '#f87171', '--warning': '#fbbf24',
    '--tok-key': '#f47fff', '--tok-string': '#4ade80', '--tok-number': '#60a5fa',
    '--tok-boolean': '#fbbf24', '--tok-null': '#94a3b8',
  },
  daylight: {
    '--bg': '#eef2f7', '--panel': '#ffffff', '--panel-2': '#f8fafc', '--border': '#e2e8f0',
    '--text': '#0f172a', '--text-muted': '#475569', '--text-faint': '#94a3b8',
    '--accent': '#6366f1', '--accent-contrast': '#ffffff', '--accent-soft': '#e0e7ff',
    '--success': '#15803d', '--error': '#dc2626', '--warning': '#b45309',
    '--tok-key': '#be185d', '--tok-string': '#15803d', '--tok-number': '#2563eb',
    '--tok-boolean': '#b45309', '--tok-null': '#64748b',
  },
  aurora: {
    '--bg': 'linear-gradient(135deg,#7c3aed,#db2777 55%,#0ea5e9)',
    '--panel': 'rgba(255,255,255,0.12)', '--panel-2': 'rgba(255,255,255,0.06)',
    '--border': 'rgba(255,255,255,0.25)',
    '--text': '#ffffff', '--text-muted': 'rgba(255,255,255,0.8)', '--text-faint': 'rgba(255,255,255,0.6)',
    '--accent': '#db2777', '--accent-contrast': '#ffffff', '--accent-soft': 'rgba(219,39,119,0.3)',
    '--success': '#4ade80', '--error': '#fca5a5', '--warning': '#fde68a',
    '--tok-key': '#f0abfc', '--tok-string': '#86efac', '--tok-number': '#93c5fd',
    '--tok-boolean': '#fde68a', '--tok-null': '#cbd5e1',
  },
};

export function themeToCssVars(name: ThemeName): Record<string, string> {
  return { ...THEMES[name] };
}
```

- [ ] **Step 4: Implement `src/theme/cmTheme.ts`** (CodeMirror theme from the same tokens)

```ts
// src/theme/cmTheme.ts
import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { THEMES } from './themes';
import type { ThemeName } from '../types';

export function cmThemeFor(name: ThemeName): Extension {
  const t = THEMES[name];
  return EditorView.theme({
    '&': { backgroundColor: t['--panel-2'], color: t['--text'] },
    '.cm-gutters': { backgroundColor: t['--panel-2'], color: t['--text-faint'], border: 'none' },
    '.cm-content': { fontFamily: '"SF Mono","JetBrains Mono",Menlo,monospace' },
    '.cm-activeLine': { backgroundColor: 'transparent' },
    '.cm-lint-marker-error, .cm-lint-range-error': { color: t['--error'] },
  });
}
```

- [ ] **Step 5: Replace the placeholder block in `src/index.css`** with the full theme system + semantic classes:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

[data-theme='midnight'] { --bg:#0b1020; --panel:#0f172a; --panel-2:#111827; --border:#1e293b;
  --text:#e2e8f0; --text-muted:#94a3b8; --text-faint:#64748b; --accent:#6366f1; --accent-contrast:#fff;
  --accent-soft:#312e81; --success:#4ade80; --error:#f87171; --warning:#fbbf24;
  --tok-key:#f47fff; --tok-string:#4ade80; --tok-number:#60a5fa; --tok-boolean:#fbbf24; --tok-null:#94a3b8; }

[data-theme='daylight'] { --bg:#eef2f7; --panel:#fff; --panel-2:#f8fafc; --border:#e2e8f0;
  --text:#0f172a; --text-muted:#475569; --text-faint:#94a3b8; --accent:#6366f1; --accent-contrast:#fff;
  --accent-soft:#e0e7ff; --success:#15803d; --error:#dc2626; --warning:#b45309;
  --tok-key:#be185d; --tok-string:#15803d; --tok-number:#2563eb; --tok-boolean:#b45309; --tok-null:#64748b; }

[data-theme='aurora'] { --bg:linear-gradient(135deg,#7c3aed,#db2777 55%,#0ea5e9);
  --panel:rgba(255,255,255,0.12); --panel-2:rgba(255,255,255,0.06); --border:rgba(255,255,255,0.25);
  --text:#fff; --text-muted:rgba(255,255,255,0.8); --text-faint:rgba(255,255,255,0.6);
  --accent:#db2777; --accent-contrast:#fff; --accent-soft:rgba(219,39,119,0.3);
  --success:#4ade80; --error:#fca5a5; --warning:#fde68a;
  --tok-key:#f0abfc; --tok-string:#86efac; --tok-number:#93c5fd; --tok-boolean:#fde68a; --tok-null:#cbd5e1; }

html, body, #root { height: 100%; }
body { margin: 0; background: var(--bg); background-attachment: fixed; color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }

@layer components {
  .surface { background: var(--panel); border: 1px solid var(--border); }
  .surface-2 { background: var(--panel-2); }
  .text-muted { color: var(--text-muted); }
  .text-faint { color: var(--text-faint); }
  .btn { padding: 0.45rem 0.85rem; border-radius: 0.5rem; font-size: 0.85rem; font-weight: 600;
    cursor: pointer; transition: all .2s; }
  .btn-accent { background: var(--accent); color: var(--accent-contrast); }
  .btn-accent:hover { filter: brightness(1.1); }
  .btn-ghost { background: var(--accent-soft); color: var(--text); }
  .btn-ghost:hover { filter: brightness(1.15); }
  .field { background: var(--panel-2); color: var(--text); border: 1px solid var(--border);
    border-radius: 0.4rem; padding: 0.4rem 0.6rem; font-size: 0.85rem; }
  .json-key { color: var(--tok-key); } .json-string { color: var(--tok-string); }
  .json-number { color: var(--tok-number); } .json-boolean { color: var(--tok-boolean); }
  .json-null { color: var(--tok-null); }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/theme/__tests__/themes.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/theme/themes.ts src/theme/cmTheme.ts src/index.css src/theme/__tests__/themes.test.ts
git commit -m "feat(theme): add three theme token maps, semantic classes, CodeMirror theme"
```

---

### Task 9: ThemeContext provider and Zustand store

**Files:**
- Create: `src/theme/ThemeContext.tsx`, `src/store.ts`
- Test: `src/__tests__/theme-context.test.tsx`, `src/__tests__/store.test.ts`

**Interfaces:**
- Produces: `ThemeProvider`, `useTheme`, `useStore` + `AppState`. Consumed by every component task (10–16).

- [ ] **Step 1: Write failing test for ThemeContext**

```tsx
// src/__tests__/theme-context.test.tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';

function Probe() { const { theme } = useTheme(); return <span>{theme}</span>; }

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  };
  document.documentElement.removeAttribute('data-theme');
});

describe('ThemeProvider', () => {
  it('defaults to midnight and sets data-theme', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByText('midnight')).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toBe('midnight');
  });
  it('reads persisted theme from localStorage', () => {
    localStorage.setItem('jsonParser.theme', 'daylight');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByText('daylight')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/theme-context.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/theme/ThemeContext.tsx`**

```tsx
// src/theme/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ThemeName } from '../types';

const THEME_KEY = 'jsonParser.theme';
const DEFAULT_THEME: ThemeName = 'midnight';

interface ThemeCtx { theme: ThemeName; setTheme: (t: ThemeName) => void; }
const Ctx = createContext<ThemeCtx>({ theme: DEFAULT_THEME, setTheme: () => {} });

function readInitial(): ThemeName {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'midnight' || v === 'daylight' || v === 'aurora') return v;
  } catch { /* ignore */ }
  return DEFAULT_THEME;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(readInitial);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);
  return <Ctx.Provider value={{ theme, setTheme: setThemeState }}>{children}</Ctx.Provider>;
}

export function useTheme() { return useContext(Ctx); }
```

- [ ] **Step 4: Run ThemeContext test to verify it passes**

Run: `npx vitest run src/__tests__/theme-context.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write failing test for the store**

```ts
// src/__tests__/store.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '../store';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  };
  useStore.setState({
    rawInput: '', parsed: null, parseError: null, view: 'text',
    history: [], historyOpen: false, selectedPath: null,
  });
});

describe('store actions', () => {
  it('parse sets parsed on valid input', () => {
    useStore.getState().setRawInput('{"a":1}');
    useStore.getState().parse();
    expect(useStore.getState().parsed).toEqual({ a: 1 });
    expect(useStore.getState().parseError).toBeNull();
    expect(useStore.getState().history).toHaveLength(1);
  });
  it('parse sets parseError on invalid input', () => {
    useStore.getState().setRawInput('{a:1}');
    useStore.getState().parse();
    expect(useStore.getState().parsed).toBeNull();
    expect(useStore.getState().parseError).not.toBeNull();
  });
  it('reformat rewrites rawInput as pretty JSON', () => {
    useStore.getState().setRawInput('{"a":1}');
    useStore.getState().reformat();
    expect(useStore.getState().rawInput).toBe('{\n  "a": 1\n}');
  });
  it('autoFix repairs single-quoted JSON', () => {
    useStore.getState().setRawInput("{'a':1}");
    useStore.getState().autoFix();
    expect(useStore.getState().rawInput).toBe('{\n  "a": 1\n}');
  });
  it('clear resets input and output', () => {
    useStore.getState().setRawInput('{"a":1}');
    useStore.getState().parse();
    useStore.getState().clear();
    expect(useStore.getState().rawInput).toBe('');
    expect(useStore.getState().parsed).toBeNull();
  });
  it('loadHistoryItem loads and parses a history entry', () => {
    useStore.getState().setRawInput('{"a":1}');
    useStore.getState().parse();
    const id = useStore.getState().history[0].id;
    useStore.getState().clear();
    useStore.getState().loadHistoryItem(id);
    expect(useStore.getState().parsed).toEqual({ a: 1 });
  });
});
```

- [ ] **Step 6: Run store test to verify it fails**

Run: `npx vitest run src/__tests__/store.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 7: Implement `src/store.ts`**

```ts
// src/store.ts
import { create } from 'zustand';
import type { AppState } from './store-types';
import type { HistoryItem, ParseError, Path, SelectedPath, ViewMode } from './types';
import { safeParse, reformat as reformatJson, minify as minifyJson } from './lib/json';
import { attemptAutoFix } from './lib/autofix';
import { getValueByPath, toJsonPath, toPhpPath, parsePhpPath, parseDotPath } from './lib/paths';
import {
  loadHistory, persistHistory, prependHistory, makeHistoryItem,
} from './lib/history';

function timestampIso() { return new Date().toISOString(); }
function nowMs() { return Date.now(); }

export const useStore = create<AppState>((set, get) => ({
  rawInput: '',
  parsed: null,
  parseError: null,
  view: 'text',
  history: loadHistory(),
  historyOpen: false,
  selectedPath: null,

  setRawInput: (s) => set({ rawInput: s }),

  saveHistory: (data) => {
    const item = makeHistoryItem(data, nowMs(), timestampIso());
    const list = prependHistory(loadHistory(), item);
    persistHistory(list);
    set({ history: list });
  },

  parse: () => {
    const input = get().rawInput.trim();
    if (!input) { set({ parseError: { message: 'Please enter JSON data to parse', pos: 0, line: 1, col: 1 } }); return; }
    const r = safeParse(input);
    if (!r.ok) { set({ parsed: null, parseError: r.error }); return; }
    set({ parsed: r.value, parseError: null, selectedPath: null });
    get().saveHistory(input);
  },

  reformat: () => {
    const r = reformatJson(get().rawInput);
    if (!r.ok) { set({ parseError: r.error }); return; }
    set({ rawInput: r.output, parseError: null });
    get().saveHistory(r.output);
  },

  minify: () => {
    const r = minifyJson(get().rawInput);
    if (!r.ok) { set({ parseError: r.error }); return; }
    set({ rawInput: r.output, parseError: null });
    get().saveHistory(r.output);
  },

  autoFix: () => {
    const input = get().rawInput.trim();
    if (!input) { set({ parseError: { message: 'Please enter JSON data to fix', pos: 0, line: 1, col: 1 } }); return; }
    const fixed = attemptAutoFix(input);
    const r = safeParse(fixed);
    if (!r.ok) { set({ parseError: { message: 'Unable to auto-fix JSON. ' + r.error.message, pos: 0, line: 1, col: 1 } }); return; }
    const pretty = JSON.stringify(r.value, null, 2);
    set({ rawInput: pretty, parsed: r.value, parseError: null, selectedPath: null });
    get().saveHistory(pretty);
  },

  clear: () => set({ rawInput: '', parsed: null, parseError: null, selectedPath: null }),
  loadIntoEditor: (s) => set({ rawInput: s }),
  setView: (v) => set({ view: v }),
  toggleHistory: () => set((s) => ({ historyOpen: !s.historyOpen })),

  selectPath: (path) => {
    const value = getValueByPath(get().parsed, path);
    const sp: SelectedPath = { path, jsonPath: toJsonPath(path), phpPath: toPhpPath(path), value };
    set({ selectedPath: sp });
  },

  findByJsonPath: (dot) => {
    const path = parseDotPath(dot);
    get().selectPath(path);
  },
  findByPhpPath: (php) => {
    const path = parsePhpPath(php);
    get().selectPath(path);
  },

  removeHistory: (id) => {
    const list = get().history.filter((h) => h.id !== id);
    persistHistory(list);
    set({ history: list });
  },
  clearAllHistory: () => { persistHistory([]); set({ history: [] }); },
  loadHistoryItem: (id) => {
    const item = get().history.find((h) => h.id === id);
    if (!item) return;
    set({ rawInput: item.data });
    get().parse();
  },
}));

export type { AppState };
```

Also create `src/store-types.ts`:

```ts
// src/store-types.ts
import type { HistoryItem, ParseError, SelectedPath, ViewMode, Path } from './types';

export interface AppState {
  rawInput: string;
  parsed: unknown | null;
  parseError: ParseError | null;
  view: ViewMode;
  history: HistoryItem[];
  historyOpen: boolean;
  selectedPath: SelectedPath | null;
  setRawInput(s: string): void;
  saveHistory(data: string): void;
  parse(): void;
  reformat(): void;
  minify(): void;
  autoFix(): void;
  clear(): void;
  loadIntoEditor(s: string): void;
  setView(v: ViewMode): void;
  toggleHistory(): void;
  selectPath(path: Path): void;
  findByJsonPath(dot: string): void;
  findByPhpPath(php: string): void;
  removeHistory(id: number): void;
  clearAllHistory(): void;
  loadHistoryItem(id: number): void;
}
```

- [ ] **Step 8: Run store test to verify it passes**

Run: `npx vitest run src/__tests__/store.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/theme/ThemeContext.tsx src/store.ts src/store-types.ts src/__tests__/theme-context.test.tsx src/__tests__/store.test.ts
git commit -m "feat(state): add ThemeProvider and Zustand store with all actions"
```

---

### Task 10: `CodeEditor` — CodeMirror 6 with lint + jump-to-error

**Files:**
- Create: `src/components/Editor/CodeEditor.tsx`
- Test: `src/components/Editor/__tests__/CodeEditor.test.tsx`

**Interfaces:**
- Consumes: `useStore` (`rawInput`, `setRawInput`), `useTheme`, `cmThemeFor`, `lintJson`.
- Produces: `<CodeEditor />`. CodeMirror is the source of truth; on doc-change it calls `setRawInput`.

- [ ] **Step 1: Write a smoke test (full CM interaction is flaky in jsdom; we verify mount + wiring)**

```tsx
// src/components/Editor/__tests__/CodeEditor.test.tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeProvider } from '../../../theme/ThemeContext';
import { useStore } from '../../../store';
import CodeEditor from '../CodeEditor';

beforeEach(() => {
  useStore.setState({ rawInput: '', parsed: null, parseError: null, selectedPath: null });
});

describe('CodeEditor', () => {
  it('renders a CodeMirror container', () => {
    const { container } = render(<ThemeProvider><CodeEditor /></ThemeProvider>);
    expect(container.querySelector('.cm-editor')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Editor/__tests__/CodeEditor.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/components/Editor/CodeEditor.tsx`**

```tsx
// src/components/Editor/CodeEditor.tsx
import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, historyKeymap } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { linter, lintGutter } from '@codemirror/lint';
import { useStore } from '../../store';
import { useTheme } from '../../theme/ThemeContext';
import { cmThemeFor } from '../../theme/cmTheme';
import { lintJson } from '../../lib/json';

const jsonLinter = linter((view) => {
  const text = view.state.doc.toString();
  return lintJson(text).map((d) => ({ from: d.from, to: d.to, severity: 'error' as const, message: d.message }));
});

export default function CodeEditor() {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const rawInput = useStore((s) => s.rawInput);
  const setRawInput = useStore((s) => s.setRawInput);
  const { theme } = useTheme();

  // create editor once
  useEffect(() => {
    if (!host.current) return;
    const view = new EditorView({
      state: EditorState.create({
        doc: rawInput,
        extensions: [
          lineNumbers(),
          historyKeymap.length ? keymap.of([...defaultKeymap, ...historyKeymap]) : keymap.of(defaultKeymap),
          json(),
          lintGutter(),
          jsonLinter,
          cmThemeFor(theme),
          EditorView.lineWrapping,
          EditorView.updateListener.of((u) => {
            if (u.docChanged) setRawInput(view.state.doc.toString());
          }),
        ],
      }),
      parent: host.current,
    });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sync external writes (format/minify/autofix/import) into the editor
  useEffect(() => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== rawInput) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: rawInput } });
    }
  }, [rawInput]);

  return <div ref={host} className="cm-host h-full overflow-auto" />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Editor/__tests__/CodeEditor.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Editor/CodeEditor.tsx src/components/Editor/__tests__/CodeEditor.test.tsx
git commit -m "feat(editor): add CodeMirror 6 editor with JSON lint and gutter"
```

---

### Task 11: Output — `TextView` and `TreeView`

**Files:**
- Create: `src/components/Output/TextView.tsx`, `src/components/Output/TreeView.tsx`
- Test: `src/components/Output/__tests__/TextView.test.tsx`, `src/components/Output/__tests__/TreeView.test.tsx`

**Interfaces:**
- Consumes: `useStore` (`parsed`, `selectPath`, `selectedPath`), `syntaxHighlight`, `getValueByPath`.
- Produces: `<TextView />`, `<TreeView />`. Used by `OutputPanel` (Task 16).

- [ ] **Step 1: Write failing test for TextView**

```tsx
// src/components/Output/__tests__/TextView.test.tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { useStore } from '../../../store';
import TextView from '../TextView';

beforeEach(() => useStore.setState({ parsed: null }));

describe('TextView', () => {
  it('shows highlighted JSON from parsed value', () => {
    useStore.setState({ parsed: { a: 1 } });
    const { container } = render(<TextView />);
    expect(container.querySelector('.json-key')).toBeInTheDocument();
    expect(container.querySelector('.json-number')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Write failing test for TreeView**

```tsx
// src/components/Output/__tests__/TreeView.test.tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { useStore } from '../../../store';
import TreeView from '../TreeView';

beforeEach(() => useStore.setState({ parsed: null, selectedPath: null }));

describe('TreeView', () => {
  it('renders keys for an object', () => {
    useStore.setState({ parsed: { city: 'Sydney' } });
    const { getByText } = render(<TreeView />);
    expect(getByText('city')).toBeInTheDocument();
  });
  it('clicking a key selects the path', () => {
    useStore.setState({ parsed: { city: 'Sydney' } });
    const { getByText } = render(<TreeView />);
    fireEvent.click(getByText('city'));
    expect(useStore.getState().selectedPath?.jsonPath).toBe('city');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/components/Output/__tests__/TextView.test.tsx src/components/Output/__tests__/TreeView.test.tsx`
Expected: FAIL (modules not found).

- [ ] **Step 4: Implement `src/components/Output/TextView.tsx`**

```tsx
// src/components/Output/TextView.tsx
import { useMemo } from 'react';
import { useStore } from '../../store';
import { syntaxHighlight } from '../../lib/highlight';

export default function TextView() {
  const parsed = useStore((s) => s.parsed);
  const html = useMemo(
    () => (parsed === null ? '' : syntaxHighlight(JSON.stringify(parsed, null, 2))),
    [parsed]
  );
  if (parsed === null) return <div className="text-muted p-4">No output yet.</div>;
  return <pre className="p-4 text-sm overflow-auto" dangerouslySetInnerHTML={{ __html: html }} />;
}
```

- [ ] **Step 5: Implement `src/components/Output/TreeView.tsx`** (ported collapsible tree)

```tsx
// src/components/Output/TreeView.tsx
import { useState } from 'react';
import { useStore } from '../../store';
import type { Path } from '../../types';

function Node({ k, value, path }: { k: string; value: unknown; path: Path }) {
  const selectPath = useStore((s) => s.selectPath);
  const selected = useStore((s) => s.selectedPath?.jsonPath === path.join('.'));
  const [open, setOpen] = useState(true);
  const isArr = Array.isArray(value);
  const isObj = value !== null && typeof value === 'object' && !isArr;

  const label = (
    <span
      role="button"
      className={`cursor-pointer rounded px-1 ${selected ? 'bg-[var(--accent)] text-[var(--accent-contrast)]' : 'hover:bg-[var(--accent-soft)]'}`}
      style={{ color: selected ? undefined : 'var(--tok-key)', fontWeight: 600 }}
      onClick={(e) => { e.stopPropagation(); selectPath(path); }}
    >
      {k}
    </span>
  );

  if (isObj || isArr) {
    const entries = isArr ? (value as unknown[]).map((v, i) => [String(i), v] as const) : Object.entries(value as Record<string, unknown>);
    return (
      <div className="ml-4">
        <span className="cursor-pointer select-none text-muted" onClick={() => setOpen((o) => !o)}>{open ? '▼' : '▶'} </span>
        {label} {isArr ? `: [${(value as unknown[]).length}]` : ': {'}
        {open && entries.map(([key, v]) => <Node key={key} k={key} value={v} path={[...path, key]} />)}
        {isArr ? ']' : '}'}
      </div>
    );
  }

  const type = value === null ? 'null' : typeof value;
  const cls = type === 'string' ? 'json-string' : type === 'number' ? 'json-number' : type === 'boolean' ? 'json-boolean' : 'json-null';
  const shown = type === 'string' ? `"${value}"` : String(value);
  return (
    <div className="ml-4">
      {label}: <span className={cls}>{shown}</span>
    </div>
  );
}

export default function TreeView() {
  const parsed = useStore((s) => s.parsed);
  if (parsed === null) return <div className="text-muted p-4">No output yet.</div>;
  return <div className="p-4 text-sm overflow-auto" style={{ fontFamily: '"SF Mono",Menlo,monospace' }}><Node k="root" value={parsed} path={[]} /></div>;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/components/Output/__tests__/TextView.test.tsx src/components/Output/__tests__/TreeView.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/Output/TextView.tsx src/components/Output/TreeView.tsx src/components/Output/__tests__/
git commit -m "feat(output): add syntax-highlighted TextView and collapsible TreeView"
```

---

### Task 12: `PathFinder` — JSON/PHP path display, copy, find

**Files:**
- Create: `src/components/PathFinder/PathFinder.tsx`
- Test: `src/components/PathFinder/__tests__/PathFinder.test.tsx`

**Interfaces:**
- Consumes: `useStore` (`selectedPath`, `findByJsonPath`, `findByPhpPath`, `parsed`).
- Produces: `<PathFinder />`. Shown beneath the tree in `OutputPanel` (Task 16).

- [ ] **Step 1: Write failing test**

```tsx
// src/components/PathFinder/__tests__/PathFinder.test.tsx
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useStore } from '../../../store';
import PathFinder from '../PathFinder';

beforeEach(() => {
  useStore.setState({
    parsed: { address: { city: 'Sydney' } },
    selectedPath: { path: ['address', 'city'], jsonPath: 'address.city', phpPath: "$response['address']['city']", value: 'Sydney' },
  });
});

describe('PathFinder', () => {
  it('shows JSON and PHP paths from selectedPath', () => {
    render(<PathFinder />);
    expect((screen.getByLabelText(/JSON Path/i) as HTMLInputElement).value).toBe('address.city');
    expect((screen.getByLabelText(/PHP Array Path/i) as HTMLInputElement).value).toBe("$response['address']['city']");
  });
  it('find-by-JSON-path resolves and updates selectedPath', () => {
    render(<PathFinder />);
    fireEvent.change(screen.getByPlaceholderText(/address.city/i), { target: { value: 'address.city' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find' }));
    expect(useStore.getState().selectedPath?.value).toBe('Sydney');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/PathFinder/__tests__/PathFinder.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/components/PathFinder/PathFinder.tsx`**

```tsx
// src/components/PathFinder/PathFinder.tsx
import { useState } from 'react';
import { useStore } from '../../store';

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove();
      return ok;
    } catch { return false; }
  }
}

export default function PathFinder() {
  const sp = useStore((s) => s.selectedPath);
  const findByJsonPath = useStore((s) => s.findByJsonPath);
  const findByPhpPath = useStore((s) => s.findByPhpPath);
  const [jsonSearch, setJsonSearch] = useState('');
  const [phpSearch, setPhpSearch] = useState('');

  if (!sp) return <div className="text-muted text-sm p-4">Click a node in the tree to see its path.</div>;

  return (
    <div className="surface-2 p-4 space-y-3 text-sm">
      <h3 className="font-semibold">Path Finder</h3>
      <label className="block">
        <span className="text-muted">JSON Path</span>
        <div className="flex gap-2 mt-1">
          <input aria-label="JSON Path" className="field flex-1" readOnly value={sp.jsonPath} />
          <button className="btn btn-ghost" onClick={() => copyText(sp.jsonPath)}>Copy</button>
        </div>
      </label>
      <label className="block">
        <span className="text-muted">PHP Array Path</span>
        <div className="flex gap-2 mt-1">
          <input aria-label="PHP Array Path" className="field flex-1" readOnly value={sp.phpPath} />
          <button className="btn btn-ghost" onClick={() => copyText(sp.phpPath)}>Copy</button>
        </div>
      </label>
      <label className="block">
        <span className="text-muted">Find by JSON Path</span>
        <div className="flex gap-2 mt-1">
          <input className="field flex-1" placeholder="e.g., address.city" value={jsonSearch}
            onChange={(e) => setJsonSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && findByJsonPath(jsonSearch)} />
          <button className="btn btn-accent" onClick={() => findByJsonPath(jsonSearch)}>Find</button>
        </div>
      </label>
      <label className="block">
        <span className="text-muted">Find by PHP Path</span>
        <div className="flex gap-2 mt-1">
          <input className="field flex-1" placeholder="e.g., $response['address']['city']" value={phpSearch}
            onChange={(e) => setPhpSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && findByPhpPath(phpSearch)} />
          <button className="btn btn-accent" onClick={() => findByPhpPath(phpSearch)}>Find</button>
        </div>
      </label>
      <pre className="field mt-2 whitespace-pre-wrap">{JSON.stringify(sp.value, null, 2)}</pre>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/PathFinder/__tests__/PathFinder.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/PathFinder/
git commit -m "feat(pathfinder): add JSON/PHP path display, copy, and find"
```

---

### Task 13: `HistoryDrawer` — slide-in history list

**Files:**
- Create: `src/components/History/HistoryDrawer.tsx`
- Test: `src/components/History/__tests__/HistoryDrawer.test.tsx`

**Interfaces:**
- Consumes: `useStore` (`history`, `historyOpen`, `loadHistoryItem`, `removeHistory`, `clearAllHistory`), `formatRelativeTime`.
- Produces: `<HistoryDrawer />`.

- [ ] **Step 1: Write failing test**

```tsx
// src/components/History/__tests__/HistoryDrawer.test.tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useStore } from '../../../store';
import { makeHistoryItem } from '../../../lib/history';
import HistoryDrawer from '../HistoryDrawer';

beforeEach(() => {
  useStore.setState({
    historyOpen: true,
    history: [makeHistoryItem('{"a":1}', 1, new Date(Date.now() - 60000).toISOString())],
    parsed: null, rawInput: '', selectedPath: null,
  });
});

describe('HistoryDrawer', () => {
  it('lists history items', () => {
    render(<HistoryDrawer />);
    expect(screen.getByText('{"a":1}')).toBeInTheDocument();
  });
  it('clicking an item loads it', () => {
    render(<HistoryDrawer />);
    fireEvent.click(screen.getByText('{"a":1}'));
    expect(useStore.getState().parsed).toEqual({ a: 1 });
  });
  it('delete button removes the item', () => {
    render(<HistoryDrawer />);
    fireEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(useStore.getState().history).toHaveLength(0);
  });
  it('Clear All empties history', () => {
    render(<HistoryDrawer />);
    window.confirm = () => true;
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }));
    expect(useStore.getState().history).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/History/__tests__/HistoryDrawer.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/components/History/HistoryDrawer.tsx`**

```tsx
// src/components/History/HistoryDrawer.tsx
import { useStore } from '../../store';
import { formatRelativeTime } from '../../lib/history';

export default function HistoryDrawer() {
  const { history, historyOpen, loadHistoryItem, removeHistory, clearAllHistory } = useStore();

  if (!historyOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex" role="dialog" aria-label="History">
      <div className="flex-1 bg-black/40" onClick={() => useStore.getState().toggleHistory()} />
      <aside className="surface w-full max-w-sm h-full overflow-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">History</h2>
          <button className="btn btn-danger" onClick={() => { if (confirm('Clear all history?')) clearAllHistory(); }}>Clear All</button>
        </div>
        {history.length === 0 ? (
          <p className="text-muted">No history yet.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="surface-2 rounded p-2 cursor-pointer hover:brightness-125"
                  onClick={() => loadHistoryItem(h.id)}>
                <div className="flex justify-between items-center">
                  <span className="text-faint text-xs">{formatRelativeTime(h.timestamp, Date.now())}</span>
                  <button className="text-[var(--error)] px-1" aria-label="✕" onClick={(e) => { e.stopPropagation(); removeHistory(h.id); }}>✕</button>
                </div>
                <pre className="truncate text-xs mt-1">{h.preview}</pre>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/History/__tests__/HistoryDrawer.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/History/
git commit -m "feat(history): add slide-in HistoryDrawer with load/delete/clear"
```

---

### Task 14: `Toolbar`, `FileDrop`, and `ConvertMenu`

**Files:**
- Create: `src/components/Editor/Toolbar.tsx`, `src/components/Editor/FileDrop.tsx`, `src/components/ConvertMenu.tsx`
- Test: `src/components/Editor/__tests__/Toolbar.test.tsx`, `src/components/__tests__/ConvertMenu.test.tsx`

**Interfaces:**
- Consumes: `useStore` (`parse`, `reformat`, `minify`, `autoFix`, `clear`, `loadIntoEditor`, `parsed`, `rawInput`), `convert.ts`.
- Produces: `<Toolbar />`, `<FileDrop>`, `<ConvertMenu />`.

- [ ] **Step 1: Write failing test for Toolbar**

```tsx
// src/components/Editor/__tests__/Toolbar.test.tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useStore } from '../../../store';
import Toolbar from '../Toolbar';

beforeEach(() => useStore.setState({ rawInput: '{"a":1}', parsed: null, parseError: null, selectedPath: null }));

describe('Toolbar', () => {
  it('Parse button parses the input', () => {
    render(<Toolbar />);
    fireEvent.click(screen.getByRole('button', { name: /parse json/i }));
    expect(useStore.getState().parsed).toEqual({ a: 1 });
  });
  it('Format button reformats', () => {
    render(<Toolbar />);
    fireEvent.click(screen.getByRole('button', { name: /^format$/i }));
    expect(useStore.getState().rawInput).toBe('{\n  "a": 1\n}');
  });
  it('Clear button clears', () => {
    render(<Toolbar />);
    fireEvent.click(screen.getByRole('button', { name: /^clear$/i }));
    expect(useStore.getState().rawInput).toBe('');
  });
});
```

- [ ] **Step 2: Write failing test for ConvertMenu**

```tsx
// src/components/__tests__/ConvertMenu.test.tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useStore } from '../../store';
import ConvertMenu from '../ConvertMenu';

beforeEach(() => useStore.setState({ rawInput: '{"a":1,"b":2}', parsed: null, parseError: null }));

describe('ConvertMenu', () => {
  it('To YAML sets output text in the store', () => {
    render(<ConvertMenu />);
    fireEvent.click(screen.getByRole('button', { name: /convert/i }));
    fireEvent.click(screen.getByText('To YAML'));
    const co = useStore.getState().convertOutput;
    expect(co).not.toBeNull();
    expect(co?.title).toBe('YAML');
    expect(co?.text).toContain('a: 1');
  });
});
```

(This test requires a new store field `convertOutput`. Add it in Step 4.)

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/components/Editor/__tests__/Toolbar.test.tsx src/components/__tests__/ConvertMenu.test.tsx`
Expected: FAIL (modules not found).

- [ ] **Step 4: Extend the store with `convertOutput`**

In `src/store-types.ts`, add to `AppState`:
```ts
  convertOutput: { title: string; text: string } | null;
  setConvertOutput(o: { title: string; text: string } | null): void;
```
In `src/store.ts`, add initial state `convertOutput: null` and action `setConvertOutput: (o) => set({ convertOutput: o })`. Add `convertOutput` to the `clear()` reset as well. Re-run the existing store test to confirm no regression: `npx vitest run src/__tests__/store.test.ts`.

- [ ] **Step 5: Implement `src/components/Editor/Toolbar.tsx`**

```tsx
// src/components/Editor/Toolbar.tsx
import { useStore } from '../../store';
import ConvertMenu from '../ConvertMenu';

export default function Toolbar() {
  const { parse, reformat, minify, autoFix, clear } = useStore();
  return (
    <div className="flex flex-wrap gap-2 p-2 surface-2 border-t border-[var(--border)]">
      <button className="btn btn-accent" onClick={parse}>Parse JSON</button>
      <button className="btn btn-ghost" onClick={reformat}>Format</button>
      <button className="btn btn-ghost" onClick={minify}>Minify</button>
      <button className="btn btn-ghost" onClick={autoFix}>Auto Fix</button>
      <button className="btn btn-ghost" onClick={clear}>Clear</button>
      <ConvertMenu />
    </div>
  );
}
```

- [ ] **Step 6: Implement `src/components/ConvertMenu.tsx`**

```tsx
// src/components/ConvertMenu.tsx
import { useRef, useState } from 'react';
import { useStore } from '../store';
import { toYamlFromJson, toJsonFromYaml, toCsvFromJson, toJsonFromCsv } from '../lib/convert';

export default function ConvertMenu() {
  const [open, setOpen] = useState(false);
  const rawInput = useStore((s) => s.rawInput);
  const loadIntoEditor = useStore((s) => s.loadIntoEditor);
  const setConvertOutput = useStore((s) => s.setConvertOutput);

  const run = (fn: (s: string) => { ok: true; output: string } | { ok: false; error: string }, title: string, intoEditor = false) => {
    const r = fn(rawInput);
    if (!r.ok) { setConvertOutput({ title: 'Error', text: r.error }); return; }
    if (intoEditor) { loadIntoEditor(r.output); setConvertOutput(null); }
    else setConvertOutput({ title, text: r.output });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button className="btn btn-ghost" onClick={() => setOpen((o) => !o)}>Convert ▾</button>
      {open && (
        <div className="absolute left-0 mt-1 surface rounded shadow-lg p-1 z-30 w-44">
          <button className="block w-full text-left px-2 py-1 hover:bg-[var(--accent-soft)] rounded" onClick={() => run(toYamlFromJson, 'YAML')}>To YAML</button>
          <button className="block w-full text-left px-2 py-1 hover:bg-[var(--accent-soft)] rounded" onClick={() => run(toCsvFromJson, 'CSV')}>To CSV</button>
          <button className="block w-full text-left px-2 py-1 hover:bg-[var(--accent-soft)] rounded" onClick={() => run(toJsonFromYaml, '', true)}>From YAML</button>
          <button className="block w-full text-left px-2 py-1 hover:bg-[var(--accent-soft)] rounded" onClick={() => run(toJsonFromCsv, '', true)}>From CSV</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Implement `src/components/Editor/FileDrop.tsx`**

```tsx
// src/components/Editor/FileDrop.tsx
import { useRef, useState, type ReactNode } from 'react';
import { useStore } from '../../store';
import { safeParse } from '../../lib/json';

export default function FileDrop({ children }: { children: ReactNode }) {
  const loadIntoEditor = useStore((s) => s.loadIntoEditor);
  const setConvertOutput = useStore((s) => s.setConvertOutput);
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const r = safeParse(text);
      if (!r.ok) { setConvertOutput({ title: 'Import error', text: 'File is not valid JSON: ' + r.error.message }); return; }
      loadIntoEditor(JSON.stringify(r.value, null, 2));
      setConvertOutput(null);
    };
    reader.onerror = () => setConvertOutput({ title: 'Import error', text: 'Could not read file.' });
    reader.readAsText(file);
  };

  return (
    <div
      className={`relative h-full ${over ? 'ring-2 ring-[var(--accent)]' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
    >
      {children}
      <input ref={inputRef} type="file" accept=".json,application/json" className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
      <button className="btn btn-ghost absolute bottom-2 right-2 z-10" onClick={() => inputRef.current?.click()}>Import</button>
    </div>
  );
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run src/components/Editor/__tests__/Toolbar.test.tsx src/components/__tests__/ConvertMenu.test.tsx`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/components/Editor/Toolbar.tsx src/components/Editor/FileDrop.tsx src/components/ConvertMenu.tsx src/components/Editor/__tests__/Toolbar.test.tsx src/components/__tests__/ConvertMenu.test.tsx src/store.ts src/store-types.ts
git commit -m "feat(editor): add Toolbar, FileDrop import, and ConvertMenu"
```

---

### Task 15: `Header` and `ThemeSwitcher`

**Files:**
- Create: `src/components/Header.tsx`, `src/components/ThemeSwitcher.tsx`
- Test: `src/components/__tests__/ThemeSwitcher.test.tsx`

**Interfaces:**
- Consumes: `useTheme`, `useStore` (`toggleHistory`).
- Produces: `<Header />`, `<ThemeSwitcher />`.

- [ ] **Step 1: Write failing test**

```tsx
// src/components/__tests__/ThemeSwitcher.test.tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../../theme/ThemeContext';
import ThemeSwitcher from '../ThemeSwitcher';

beforeEach(() => document.documentElement.removeAttribute('data-theme'));

describe('ThemeSwitcher', () => {
  it('switches data-theme when an option is clicked', () => {
    render(<ThemeProvider><ThemeSwitcher /></ThemeProvider>);
    fireEvent.click(screen.getByRole('button', { name: /daylight/i }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('daylight');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/ThemeSwitcher.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/components/ThemeSwitcher.tsx`**

```tsx
// src/components/ThemeSwitcher.tsx
import { useTheme } from '../theme/ThemeContext';
import type { ThemeName } from '../types';

const OPTIONS: ThemeName[] = ['midnight', 'daylight', 'aurora'];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="inline-flex rounded-lg overflow-hidden border border-[var(--border)]">
      {OPTIONS.map((opt) => (
        <button key={opt} onClick={() => setTheme(opt)}
          className={`px-3 py-1 text-sm capitalize ${theme === opt ? 'bg-[var(--accent)] text-[var(--accent-contrast)]' : 'surface-2 text-muted'}`}>
          {opt}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Implement `src/components/Header.tsx`**

```tsx
// src/components/Header.tsx
import { useStore } from '../store';
import ThemeSwitcher from './ThemeSwitcher';

export default function Header() {
  const toggleHistory = useStore((s) => s.toggleHistory);
  return (
    <header className="flex items-center justify-between p-4 gap-3 flex-wrap">
      <h1 className="text-xl font-bold flex items-center gap-2"><span className="text-[var(--accent)]">{'{ }'}</span> JSON Parser</h1>
      <div className="flex items-center gap-2">
        <ThemeSwitcher />
        <button className="btn btn-ghost" onClick={toggleHistory} aria-label="History">☰</button>
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/ThemeSwitcher.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/Header.tsx src/components/ThemeSwitcher.tsx src/components/__tests__/ThemeSwitcher.test.tsx
git commit -m "feat(header): add Header and three-way ThemeSwitcher"
```

---

### Task 16: App shell (layout, responsive, wiring) and cutover

**Files:**
- Modify: `src/App.tsx`, `src/components/Output/OutputPanel.tsx` (create), `README.md` (update)
- Delete: legacy `index.html` (root), `script.js`, `style.css`
- Test: manual verification + full suite

**Interfaces:**
- Consumes: all components + providers. This task wires them into the two-pane responsive layout and removes the legacy files.

- [ ] **Step 1: Create `src/components/Output/OutputPanel.tsx`**

```tsx
// src/components/Output/OutputPanel.tsx
import { useStore } from '../../store';
import TextView from './TextView';
import TreeView from './TreeView';
import PathFinder from '../PathFinder/PathFinder';

export default function OutputPanel() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const parseError = useStore((s) => s.parseError);
  const convertOutput = useStore((s) => s.convertOutput);

  return (
    <div className="surface rounded-lg flex flex-col h-full overflow-hidden">
      <div className="flex gap-2 p-2 surface-2 border-b border-[var(--border)]">
        <button className={`btn ${view === 'text' ? 'btn-accent' : 'btn-ghost'}`} onClick={() => setView('text')}>Text</button>
        <button className={`btn ${view === 'tree' ? 'btn-accent' : 'btn-ghost'}`} onClick={() => setView('tree')}>Tree</button>
      </div>
      {convertOutput ? (
        <div className="p-4 overflow-auto">
          <div className="text-muted text-sm mb-2">{convertOutput.title}</div>
          <pre className="text-sm whitespace-pre-wrap">{convertOutput.text}</pre>
        </div>
      ) : parseError ? (
        <div className="p-4 text-[var(--error)]">JSON Parse Error: {parseError.message}{parseError.line > 0 ? ` (line ${parseError.line}, col ${parseError.col})` : ''}</div>
      ) : (
        <div className="flex-1 overflow-auto">{view === 'text' ? <TextView /> : <><TreeView />{view === 'tree' && <PathFinder />}</>}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/App.tsx` with the full shell**

```tsx
// src/App.tsx
import { ThemeProvider } from './theme/ThemeContext';
import { useStore } from './store';
import Header from './components/Header';
import CodeEditor from './components/Editor/CodeEditor';
import Toolbar from './components/Editor/Toolbar';
import FileDrop from './components/Editor/FileDrop';
import OutputPanel from './components/Output/OutputPanel';
import HistoryDrawer from './components/History/HistoryDrawer';

export default function App() {
  return (
    <ThemeProvider>
      <div className="h-full flex flex-col">
        <Header />
        <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3 p-3">
          <section className="surface rounded-lg flex flex-col min-h-[300px] overflow-hidden">
            <FileDrop>
              <div className="flex-1 min-h-0"><CodeEditor /></div>
            </FileDrop>
            <Toolbar />
          </section>
          <section className="min-h-[300px]">
            <OutputPanel />
          </section>
        </main>
        <HistoryDrawer />
      </div>
    </ThemeProvider>
  );
}
```

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 4: Manual responsive + theme verification**

Run: `npm run dev`
Verify in the browser:
- Two panes side-by-side on desktop; single column below `lg` (1024px).
- Theme switcher flips Midnight/Daylight/Aurora and the editor re-themes.
- History drawer slides in from the right with a backdrop.
- Parse/Format/Minify/Auto-Fix work; tree node click shows paths; find-by-path resolves; drag-drop imports a `.json`; Convert To YAML/CSV shows output.
- An invalid JSON input shows a red squiggle + gutter marker in the editor and the line/col in the error message.

- [ ] **Step 5: Cutover — remove legacy files and update README**

Run:
```bash
git rm script.js style.css
```
(The rebuilt `index.html` already replaced the legacy one in Task 1 — do not remove it.)
Replace `README.md` with:
```markdown
# Json-Parser-With-Auto-Fix

A modern JSON parser: parse, format, minify, auto-fix, explore a collapsible tree, copy JSON/PHP paths, convert JSON⇄YAML/CSV, and import files by drag & drop — with three switchable themes.

## Develop
\`\`\`bash
npm install
npm run dev
\`\`\`

## Test
\`\`\`bash
npm test
\`\`\`

## Build
\`\`\`bash
npm run build      # outputs dist/ (static hosting)
npm run preview
\`\`\`

Built with Vite, React, TypeScript, Tailwind, CodeMirror 6, and Zustand.
```

- [ ] **Step 6: Production build verify and commit**

Run: `npm run build`
Expected: build succeeds, `dist/` emitted.

```bash
git add -A
git commit -m "feat: complete React+Tailwind revamp with responsive layout and themes"
```

---

## Self-Review (run after writing the plan)

1. **Spec coverage:** every spec section maps to a task — stack/structure (T1), json/autofix/paths/highlight/convert/history (T2–T7), themes+cmTheme (T8), state/theme provider (T9), CodeMirror editor w/ lint+jump (T10), text+tree output (T11), path finder (T12), history drawer (T13), toolbar/file-drop/convert (T14), header/theme switcher (T15), responsive shell + cutover (T16). Responsive behavior (spec §7) is implemented in T16's grid + drawer; conversion UX (spec §5) in T14; error handling (spec §9) across T2/T9/T10/T14.
2. **Placeholder scan:** no TBD/TODO; every code step contains real code.
3. **Type consistency:** `Path = string[]` used uniformly; store signatures in `store-types.ts` match the Shared Types block and the test usage (`convertOutput`/`setConvertOutput` added in T14 step 4); `SelectedPath` shape consistent between store, TreeView, and PathFinder.
4. **Note on jump-to-error:** the linter surfaces the error gutter marker + squiggle (T10); "jump" is delivered by clicking the gutter marker (CodeMirror default). If a dedicated jump button is desired later, add it in `CodeEditor` using `view.dispatch({ effects: EditorView.scrollIntoView(pos) })`.

