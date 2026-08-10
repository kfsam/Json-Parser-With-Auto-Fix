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
  it('toJsonFromYaml rejects empty input', () => {
    const r = toJsonFromYaml('');
    expect(r.ok).toBe(false);
  });
});
