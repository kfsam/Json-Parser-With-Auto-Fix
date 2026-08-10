import { useState } from 'react';
import { useStore } from '../../store';
import type { Path } from '../../types';

function Node({ k, value, path }: { k: string; value: unknown; path: Path }) {
  const selectPath = useStore((s) => s.selectPath);
  const selected = useStore((s) => s.selectedPath?.jsonPath === path.join('.'));
  const [open, setOpen] = useState(true);
  const isArr = Array.isArray(value);
  const isObj = value !== null && typeof value === 'object' && !isArr;

  const label = (
    <span
      role="button"
      className={`cursor-pointer rounded px-1 ${selected ? 'bg-[var(--accent)] text-[var(--accent-contrast)]' : 'hover:bg-[var(--accent-soft)]'}`}
      style={{ color: selected ? undefined : 'var(--tok-key)', fontWeight: 600 }}
      onClick={(e) => { e.stopPropagation(); selectPath(path); }}
    >
      {k}
    </span>
  );

  if (isObj || isArr) {
    const entries = isArr ? (value as unknown[]).map((v, i) => [String(i), v] as const) : Object.entries(value as Record<string, unknown>);
    return (
      <div className="ml-4">
        <span className="cursor-pointer select-none text-muted" onClick={() => setOpen((o) => !o)}>{open ? '▼' : '▶'} </span>
        {label} {isArr ? `: [${(value as unknown[]).length}]` : ': {'}
        {open && entries.map(([key, v]) => <Node key={key} k={key} value={v} path={[...path, key]} />)}
        {isArr ? ']' : '}'}
      </div>
    );
  }

  const type = value === null ? 'null' : typeof value;
  const cls = type === 'string' ? 'json-string' : type === 'number' ? 'json-number' : type === 'boolean' ? 'json-boolean' : 'json-null';
  const shown = type === 'string' ? `"${value}"` : String(value);
  return (
    <div className="ml-4">
      {label}: <span className={cls}>{shown}</span>
    </div>
  );
}

export default function TreeView() {
  const parsed = useStore((s) => s.parsed);
  if (parsed === null) return <div className="text-muted p-4">No output yet.</div>;
  return <div className="p-4 text-sm overflow-auto" style={{ fontFamily: '"SF Mono",Menlo,monospace' }}><Node k="root" value={parsed} path={[]} /></div>;
}
