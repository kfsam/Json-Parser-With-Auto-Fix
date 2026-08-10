import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { THEMES } from './themes';
import type { ThemeName } from '../types';

export function cmThemeFor(name: ThemeName): Extension {
  const t = THEMES[name];
  return EditorView.theme({
    '&': { backgroundColor: t['--panel-2'], color: t['--text'] },
    '.cm-gutters': { backgroundColor: t['--panel-2'], color: t['--text-faint'], border: 'none' },
    '.cm-content': { fontFamily: '"SF Mono","JetBrains Mono",Menlo,monospace' },
    '.cm-activeLine': { backgroundColor: 'transparent' },
    '.cm-lint-marker-error, .cm-lint-range-error': { color: t['--error'] },
  });
}
