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
  it('appends missing closing braces', () => {
    expect(roundtrip('{"a": 1')).toEqual({ a: 1 });
  });
  it('leaves already-valid JSON parseable', () => {
    expect(roundtrip('{"a":1}')).toEqual({ a: 1 });
  });
  it('preserves true/false/null as literals', () => {
    expect(roundtrip('{a:true, b:false, c:null}')).toEqual({ a: true, b: false, c: null });
  });
});
