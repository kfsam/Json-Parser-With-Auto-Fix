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
