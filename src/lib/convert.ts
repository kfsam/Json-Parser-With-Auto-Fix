import yaml from 'js-yaml';
import { safeParse } from './json';

type Conv = { ok: true; output: string } | { ok: false; error: string };

export function toYamlFromJson(input: string): Conv {
  const r = safeParse(input);
  if (!r.ok) return { ok: false, error: r.error.message };
  try { return { ok: true, output: yaml.dump(r.value, { indent: 2 }) }; }
  catch (e) { return { ok: false, error: (e as Error).message }; }
}

export function toJsonFromYaml(input: string): Conv {
  try {
    const value = yaml.load(input);
    if (value === undefined) return { ok: false, error: 'Empty input' };
    return { ok: true, output: JSON.stringify(value, null, 2) };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

function csvEscape(v: unknown): string {
  const s = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsvFromJson(input: string): Conv {
  const r = safeParse(input);
  if (!r.ok) return { ok: false, error: r.error.message };
  if (!Array.isArray(r.value)) return { ok: false, error: 'CSV export requires a JSON array of objects.' };
  const rows = r.value as Record<string, unknown>[];
  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row ?? {}).forEach((k) => set.add(k));
    return set;
  }, new Set<string>()));
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape((row ?? {})[h])).join(','));
  }
  return { ok: true, output: lines.join('\n') };
}

export function toJsonFromCsv(input: string): Conv {
  const lines = input.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return { ok: true, output: '[]' };
  const parseLine = (line: string): string[] => {
    const out: string[] = []; let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cells = parseLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']));
  });
  return { ok: true, output: JSON.stringify(rows, null, 2) };
}
