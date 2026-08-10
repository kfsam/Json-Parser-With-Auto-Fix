import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';

function Probe() { const { theme } = useTheme(); return <span>{theme}</span>; }

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  };
  document.documentElement.removeAttribute('data-theme');
});

describe('ThemeProvider', () => {
  it('defaults to midnight and sets data-theme', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByText('midnight')).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toBe('midnight');
  });
  it('reads persisted theme from localStorage', () => {
    localStorage.setItem('jsonParser.theme', 'daylight');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByText('daylight')).toBeInTheDocument();
  });
});
