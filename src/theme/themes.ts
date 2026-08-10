import type { ThemeName } from '../types';

export interface ThemeTokens {
  '--bg': string; '--panel': string; '--panel-2': string; '--border': string;
  '--text': string; '--text-muted': string; '--text-faint': string;
  '--accent': string; '--accent-contrast': string; '--accent-soft': string;
  '--success': string; '--error': string; '--warning': string;
  '--tok-key': string; '--tok-string': string; '--tok-number': string;
  '--tok-boolean': string; '--tok-null': string;
}

export const THEMES: Record<ThemeName, ThemeTokens> = {
  midnight: {
    '--bg': '#0b1020', '--panel': '#0f172a', '--panel-2': '#111827', '--border': '#1e293b',
    '--text': '#e2e8f0', '--text-muted': '#94a3b8', '--text-faint': '#64748b',
    '--accent': '#6366f1', '--accent-contrast': '#ffffff', '--accent-soft': '#312e81',
    '--success': '#4ade80', '--error': '#f87171', '--warning': '#fbbf24',
    '--tok-key': '#f47fff', '--tok-string': '#4ade80', '--tok-number': '#60a5fa',
    '--tok-boolean': '#fbbf24', '--tok-null': '#94a3b8',
  },
  daylight: {
    '--bg': '#eef2f7', '--panel': '#ffffff', '--panel-2': '#f8fafc', '--border': '#e2e8f0',
    '--text': '#0f172a', '--text-muted': '#475569', '--text-faint': '#94a3b8',
    '--accent': '#6366f1', '--accent-contrast': '#ffffff', '--accent-soft': '#e0e7ff',
    '--success': '#15803d', '--error': '#dc2626', '--warning': '#b45309',
    '--tok-key': '#be185d', '--tok-string': '#15803d', '--tok-number': '#2563eb',
    '--tok-boolean': '#b45309', '--tok-null': '#64748b',
  },
  aurora: {
    '--bg': 'linear-gradient(135deg,#7c3aed,#db2777 55%,#0ea5e9)',
    '--panel': 'rgba(255,255,255,0.12)', '--panel-2': 'rgba(255,255,255,0.06)',
    '--border': 'rgba(255,255,255,0.25)',
    '--text': '#ffffff', '--text-muted': 'rgba(255,255,255,0.8)', '--text-faint': 'rgba(255,255,255,0.6)',
    '--accent': '#db2777', '--accent-contrast': '#ffffff', '--accent-soft': 'rgba(219,39,119,0.3)',
    '--success': '#4ade80', '--error': '#fca5a5', '--warning': '#fde68a',
    '--tok-key': '#f0abfc', '--tok-string': '#86efac', '--tok-number': '#93c5fd',
    '--tok-boolean': '#fde68a', '--tok-null': '#cbd5e1',
  },
};

export function themeToCssVars(name: ThemeName): Record<string, string> {
  return { ...THEMES[name] };
}
