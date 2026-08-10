export type ThemeName = 'midnight' | 'daylight' | 'aurora';
export type ViewMode = 'text' | 'tree';
export type Path = string[]; // key/index segments; numeric strings for array indices

export interface HistoryItem { id: number; data: string; timestamp: string; preview: string; }
export interface ParseError { message: string; pos: number; line: number; col: number; }
export interface SelectedPath { path: Path; jsonPath: string; phpPath: string; value: unknown; }
