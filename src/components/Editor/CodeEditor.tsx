import { useEffect, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, historyKeymap } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { linter, lintGutter, lintKeymap } from '@codemirror/lint';
import { useStore } from '../../store';
import { useTheme } from '../../theme/ThemeContext';
import { cmThemeFor } from '../../theme/cmTheme';
import { lintJson } from '../../lib/json';

const themeComp = new Compartment();

const jsonLinter = linter((view) => {
  const text = view.state.doc.toString();
  if (!text.trim()) return [];
  return lintJson(text).map((d) => ({ from: d.from, to: d.to, severity: 'error' as const, message: d.message }));
});

export default function CodeEditor() {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const rawInput = useStore((s) => s.rawInput);
  const setRawInput = useStore((s) => s.setRawInput);
  const { theme } = useTheme();

  // create editor once
  useEffect(() => {
    if (!host.current) return;
    const view = new EditorView({
      state: EditorState.create({
        doc: rawInput,
        extensions: [
          lineNumbers(),
          keymap.of([...defaultKeymap, ...historyKeymap, ...lintKeymap]),
          json(),
          lintGutter(),
          jsonLinter,
          themeComp.of(cmThemeFor(theme)),
          EditorView.lineWrapping,
          EditorView.updateListener.of((u) => {
            if (u.docChanged) setRawInput(view.state.doc.toString());
          }),
        ],
      }),
      parent: host.current,
    });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sync external writes (format/minify/autofix/import) into the editor
  useEffect(() => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== rawInput) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: rawInput } });
    }
  }, [rawInput]);

  // re-theme the editor live when the app theme changes
  useEffect(() => {
    const view = viewRef.current;
    if (view) view.dispatch({ effects: themeComp.reconfigure(cmThemeFor(theme)) });
  }, [theme]);

  return <div ref={host} className="cm-host h-full overflow-auto" />;
}
