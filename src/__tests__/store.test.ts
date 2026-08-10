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
