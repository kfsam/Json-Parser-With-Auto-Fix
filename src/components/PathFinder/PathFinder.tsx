import { useState } from 'react';
import { useStore } from '../../store';

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove();
      return ok;
    } catch { return false; }
  }
}

export default function PathFinder() {
  const sp = useStore((s) => s.selectedPath);
  const findByJsonPath = useStore((s) => s.findByJsonPath);
  const findByPhpPath = useStore((s) => s.findByPhpPath);
  const [jsonSearch, setJsonSearch] = useState('');
  const [phpSearch, setPhpSearch] = useState('');

  if (!sp) return <div className="text-muted text-sm p-4">Click a node in the tree to see its path.</div>;

  return (
    <div className="surface-2 p-4 space-y-3 text-sm">
      <h3 className="font-semibold">Path Finder</h3>
      <label className="block">
        <span className="text-muted">JSON Path</span>
        <div className="flex gap-2 mt-1">
          <input aria-label="JSON Path" className="field flex-1" readOnly value={sp.jsonPath} />
          <button className="btn btn-ghost" onClick={() => copyText(sp.jsonPath)}>Copy</button>
        </div>
      </label>
      <label className="block">
        <span className="text-muted">PHP Array Path</span>
        <div className="flex gap-2 mt-1">
          <input aria-label="PHP Array Path" className="field flex-1" readOnly value={sp.phpPath} />
          <button className="btn btn-ghost" onClick={() => copyText(sp.phpPath)}>Copy</button>
        </div>
      </label>
      <label className="block">
        <span className="text-muted">Find by JSON Path</span>
        <div className="flex gap-2 mt-1">
          <input className="field flex-1" placeholder="e.g., address.city" value={jsonSearch}
            onChange={(e) => setJsonSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && findByJsonPath(jsonSearch)} />
          <button className="btn btn-accent" onClick={() => findByJsonPath(jsonSearch)}>Find</button>
        </div>
      </label>
      <label className="block">
        <span className="text-muted">Find by PHP Path</span>
        <div className="flex gap-2 mt-1">
          <input className="field flex-1" placeholder="e.g., $response['address']['city']" value={phpSearch}
            onChange={(e) => setPhpSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && findByPhpPath(phpSearch)} />
          <button className="btn btn-accent" onClick={() => findByPhpPath(phpSearch)}>Find</button>
        </div>
      </label>
      <pre className="field mt-2 whitespace-pre-wrap">{JSON.stringify(sp.value, null, 2)}</pre>
    </div>
  );
}
