import { describe, expect, it, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeProvider } from '../../../theme/ThemeContext';
import { useStore } from '../../../store';
import CodeEditor from '../CodeEditor';

beforeEach(() => {
  useStore.setState({ rawInput: '', parsed: null, parseError: null, selectedPath: null });
});

describe('CodeEditor', () => {
  it('renders a CodeMirror container', () => {
    const { container } = render(<ThemeProvider><CodeEditor /></ThemeProvider>);
    expect(container.querySelector('.cm-editor')).toBeInTheDocument();
  });
});
