import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useStore } from '../../../store';
import PathFinder from '../PathFinder';

beforeEach(() => {
  useStore.setState({
    parsed: { address: { city: 'Sydney' } },
    selectedPath: { path: ['address', 'city'], jsonPath: 'address.city', phpPath: "$response['address']['city']", value: 'Sydney' },
  });
});

describe('PathFinder', () => {
  it('shows JSON and PHP paths from selectedPath', () => {
    render(<PathFinder />);
    expect((screen.getByLabelText(/^JSON Path$/i) as HTMLInputElement).value).toBe('address.city');
    expect((screen.getByLabelText(/^PHP Array Path$/i) as HTMLInputElement).value).toBe("$response['address']['city']");
  });
  it('find-by-JSON-path resolves and updates selectedPath', () => {
    render(<PathFinder />);
    fireEvent.change(screen.getByPlaceholderText(/address\.city/i), { target: { value: 'address.city' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Find' })[0]);
    expect(useStore.getState().selectedPath?.value).toBe('Sydney');
  });
});
