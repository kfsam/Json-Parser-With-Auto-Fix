import { create } from 'zustand';
import type { AppState } from './store-types';
import type { HistoryItem, ParseError, SelectedPath, Path, ViewMode } from './types';
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
