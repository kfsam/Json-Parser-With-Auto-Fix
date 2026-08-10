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
