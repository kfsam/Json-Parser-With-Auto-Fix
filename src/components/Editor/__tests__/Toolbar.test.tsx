import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useStore } from '../../../store';
import Toolbar from '../Toolbar';

beforeEach(() => useStore.setState({ rawInput: '{"a":1}', parsed: null, parseError: null, selectedPath: null }));

describe('Toolbar', () => {
  it('Parse button parses the input', () => {
    render(<Toolbar />);
    fireEvent.click(screen.getByRole('button', { name: /parse json/i }));
    expect(useStore.getState().parsed).toEqual({ a: 1 });
  });
  it('Format button reformats', () => {
    render(<Toolbar />);
    fireEvent.click(screen.getByRole('button', { name: /^format$/i }));
    expect(useStore.getState().rawInput).toBe('{\n  "a": 1\n}');
  });
  it('Clear button clears', () => {
    render(<Toolbar />);
    fireEvent.click(screen.getByRole('button', { name: /^clear$/i }));
    expect(useStore.getState().rawInput).toBe('');
  });
});
