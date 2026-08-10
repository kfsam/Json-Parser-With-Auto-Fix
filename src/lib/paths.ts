import type { Path } from '../types';

export function getValueByPath(obj: unknown, path: Path): unknown {
  let cur: any = obj;
  for (const key of path) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[key];
  }
  return cur;
}

export function toJsonPath(path: Path): string {
  return path.length === 0 ? 'root' : path.join('.');
}

export function toPhpPath(path: Path): string {
  if (path.length === 0) return '$response';
  let out = '$response';
  for (const key of path) {
    out += /^\d+$/.test(key) ? `[${key}]` : `['${key}']`;
  }
  return out;
}

export function parsePhpPath(php: string): Path {
  const cleaned = php.trim().replace(/^\$\w+/, '');
  const matches = cleaned.match(/\[([^\]]+)\]/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(1, -1).replace(/^['"]|['"]$/g, ''));
}

export function parseDotPath(dot: string): Path {
  return dot.split('.').map((s) => s.trim()).filter((s) => s.length > 0);
}
