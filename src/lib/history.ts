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
