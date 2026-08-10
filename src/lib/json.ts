// src/lib/json.ts
import type { ParseError } from '../types';

function posToLineCol(text: string, pos: number): { line: number; col: number } {
  let line = 1, col = 1;
  for (let i = 0; i < pos && i < text.length; i++) {
    if (text[i] === '\n') { line++; col = 1; } else col++;
  }
  return { line, col };
}

export function locateError(input: string): ParseError | null {
  try { JSON.parse(input); return null; }
  catch (e) {
    const msg = (e as Error).message;
    const m = msg.match(/position (\d+)/);
    const pos = m ? parseInt(m[1], 10) : Math.max(0, input.length - 1);
    const { line, col } = posToLineCol(input, pos);
    return { message: msg, pos, line, col };
  }
}

export function safeParse(input: string): { ok: true; value: unknown } | { ok: false; error: ParseError } {
  const err = locateError(input);
  if (err) return { ok: false, error: err };
  return { ok: true, value: JSON.parse(input) };
}

export function lintJson(text: string): { from: number; to: number; severity: 'error'; message: string }[] {
  const err = locateError(text);
  if (!err) return [];
  return [{ from: err.pos, to: Math.min(err.pos + 1, text.length), severity: 'error', message: err.message }];
}

export function reformat(input: string): { ok: true; output: string } | { ok: false; error: ParseError } {
  const r = safeParse(input);
  if (!r.ok) return r;
  return { ok: true, output: JSON.stringify(r.value, null, 2) };
}

export function minify(input: string): { ok: true; output: string } | { ok: false; error: ParseError } {
  const r = safeParse(input);
  if (!r.ok) return r;
  return { ok: true, output: JSON.stringify(r.value) };
}
