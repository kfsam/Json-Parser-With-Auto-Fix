import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useStore } from '../../../store';
import { makeHistoryItem } from '../../../lib/history';
import HistoryDrawer from '../HistoryDrawer';

beforeEach(() => {
  useStore.setState({
    historyOpen: true,
    history: [makeHistoryItem('{"a":1}', 1, new Date(Date.now() - 60000).toISOString())],
    parsed: null, rawInput: '', selectedPath: null,
  });
});

describe('HistoryDrawer', () => {
  it('lists history items', () => {
    render(<HistoryDrawer />);
    expect(screen.getByText('{"a":1}')).toBeInTheDocument();
  });
  it('clicking an item loads it', () => {
    render(<HistoryDrawer />);
    fireEvent.click(screen.getByText('{"a":1}'));
    expect(useStore.getState().parsed).toEqual({ a: 1 });
  });
  it('delete button removes the item', () => {
    render(<HistoryDrawer />);
    fireEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(useStore.getState().history).toHaveLength(0);
  });
  it('Clear All empties history', () => {
    render(<HistoryDrawer />);
    window.confirm = () => true;
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }));
    expect(useStore.getState().history).toHaveLength(0);
  });
});
