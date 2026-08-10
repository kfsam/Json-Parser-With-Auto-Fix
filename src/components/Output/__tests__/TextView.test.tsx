import { describe, expect, it, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { useStore } from '../../../store';
import TextView from '../TextView';

beforeEach(() => useStore.setState({ parsed: null }));

describe('TextView', () => {
  it('shows highlighted JSON from parsed value', () => {
    useStore.setState({ parsed: { a: 1 } });
    const { container } = render(<TextView />);
    expect(container.querySelector('.json-key')).toBeInTheDocument();
    expect(container.querySelector('.json-number')).toBeInTheDocument();
  });
});
