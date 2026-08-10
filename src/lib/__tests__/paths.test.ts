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
