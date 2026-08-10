import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useStore } from '../../store';
import ConvertMenu from '../ConvertMenu';

beforeEach(() => useStore.setState({ rawInput: '{"a":1,"b":2}', parsed: null, parseError: null }));

describe('ConvertMenu', () => {
  it('To YAML sets output text in the store', () => {
    render(<ConvertMenu />);
    fireEvent.click(screen.getByRole('button', { name: /convert/i }));
    fireEvent.click(screen.getByText('To YAML'));
    const co = useStore.getState().convertOutput;
    expect(co).not.toBeNull();
    expect(co?.title).toBe('YAML');
    expect(co?.text).toContain('a: 1');
  });
});
