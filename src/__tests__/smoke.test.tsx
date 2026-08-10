import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  it('renders the app shell (header + editor)', () => {
    const { container } = render(<App />);
    expect(screen.getByText(/JSON Parser/i)).toBeInTheDocument();
    expect(container.querySelector('.cm-editor')).toBeInTheDocument();
  });
});
