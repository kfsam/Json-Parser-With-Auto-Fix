import type { HistoryItem, ParseError, SelectedPath, ViewMode, Path } from './types';

export interface AppState {
  rawInput: string;
  parsed: unknown | null;
  parseError: ParseError | null;
  view: ViewMode;
  history: HistoryItem[];
  historyOpen: boolean;
  selectedPath: SelectedPath | null;
  convertOutput: { title: string; text: string } | null;
  setRawInput(s: string): void;
  setConvertOutput(o: { title: string; text: string } | null): void;
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
