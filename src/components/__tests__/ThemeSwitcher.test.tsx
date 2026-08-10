import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../../theme/ThemeContext';
import ThemeSwitcher from '../ThemeSwitcher';

beforeEach(() => document.documentElement.removeAttribute('data-theme'));

describe('ThemeSwitcher', () => {
  it('switches data-theme when an option is clicked', () => {
    render(<ThemeProvider><ThemeSwitcher /></ThemeProvider>);
    fireEvent.click(screen.getByRole('button', { name: /daylight/i }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('daylight');
  });
});
