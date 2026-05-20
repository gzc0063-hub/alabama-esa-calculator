import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app title', () => {
  render(<App />);
  const titleElements = screen.getAllByText(/Alabama ESA Mitigation Points Calculator/i);
  expect(titleElements.length).toBeGreaterThan(0);
});
