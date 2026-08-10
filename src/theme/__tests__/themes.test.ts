import { describe, expect, it } from 'vitest';
import { THEMES, themeToCssVars } from '../themes';

describe('themes', () => {
  it('defines all three themes with required tokens', () => {
    for (const name of ['midnight', 'daylight', 'aurora'] as const) {
      const t = THEMES[name];
      expect(t['--bg']).toBeTruthy();
      expect(t['--accent']).toBeTruthy();
      expect(t['--tok-key']).toBeTruthy();
    }
  });
  it('themeToCssVars returns the token map verbatim', () => {
    const vars = themeToCssVars('midnight');
    expect(vars['--bg']).toBe(THEMES.midnight['--bg']);
  });
});
