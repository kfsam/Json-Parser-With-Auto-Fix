import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { useStore } from '../../../store';
import TreeView from '../TreeView';

beforeEach(() => useStore.setState({ parsed: null, selectedPath: null }));

describe('TreeView', () => {
  it('renders keys for an object', () => {
    useStore.setState({ parsed: { city: 'Sydney' } });
    const { getByText } = render(<TreeView />);
    expect(getByText('city')).toBeInTheDocument();
  });
  it('clicking a key selects the path', () => {
    useStore.setState({ parsed: { city: 'Sydney' } });
    const { getByText } = render(<TreeView />);
    fireEvent.click(getByText('city'));
    expect(useStore.getState().selectedPath?.jsonPath).toBe('city');
  });
});
