import { useMemo } from 'react';
import { useStore } from '../../store';
import { syntaxHighlight } from '../../lib/highlight';

export default function TextView() {
  const parsed = useStore((s) => s.parsed);
  const html = useMemo(
    () => (parsed === null ? '' : syntaxHighlight(JSON.stringify(parsed, null, 2))),
    [parsed]
  );
  if (parsed === null) return <div className="text-muted p-4">No output yet.</div>;
  return <pre className="p-4 text-sm overflow-auto" dangerouslySetInnerHTML={{ __html: html }} />;
}
