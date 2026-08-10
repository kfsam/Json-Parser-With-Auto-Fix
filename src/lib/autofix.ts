// src/lib/autofix.ts
export function attemptAutoFix(json: string): string {
  let fixed = json;

  fixed = fixed.replace(/'/g, '"');                                  // single -> double quotes
  fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":'); // unquoted keys
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');                       // trailing commas
  // Insert missing commas between properties/elements split across lines.
  // Covers value endings: `"`, `}`, `]`, a digit, or true/false/null.
  fixed = fixed.replace(/(["}\]])\s*\n\s*"/g, '$1,\n"');
  fixed = fixed.replace(/(\d)\s*\n\s*"/g, '$1,\n"');
  fixed = fixed.replace(/\b(true|false|null)\b\s*\n\s*"/g, '$1,\n"');

  // quote unquoted string values (keep true/false/null)
  fixed = fixed.replace(/:(\s*)([a-zA-Z][a-zA-Z0-9_]*)\s*([,}\]])/g, (_m, sp, val, end) =>
    ['true', 'false', 'null'].includes(val) ? `:${sp}${val}${end}` : `:${sp}"${val}"${end}`);

  // balance brackets
  const openB = (fixed.match(/{/g) || []).length, closeB = (fixed.match(/}/g) || []).length;
  const openK = (fixed.match(/\[/g) || []).length, closeK = (fixed.match(/\]/g) || []).length;
  for (let i = 0; i < openB - closeB; i++) fixed += '}';
  for (let i = 0; i < openK - closeK; i++) fixed += ']';

  return fixed;
}
