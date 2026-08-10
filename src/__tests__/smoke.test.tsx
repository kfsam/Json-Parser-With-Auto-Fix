import { render, screen } from '@testing-library/react';
import App from '../App';

test('renders scaffolding marker', () => {
  render(<App />);
  expect(screen.getByText(/scaffolding OK/i)).toBeInTheDocument();
});
