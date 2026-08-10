import { useRef, useState } from 'react';
import { useStore } from '../store';
import { toYamlFromJson, toJsonFromYaml, toCsvFromJson, toJsonFromCsv } from '../lib/convert';

export default function ConvertMenu() {
  const [open, setOpen] = useState(false);
  const rawInput = useStore((s) => s.rawInput);
  const loadIntoEditor = useStore((s) => s.loadIntoEditor);
  const setConvertOutput = useStore((s) => s.setConvertOutput);

  const run = (fn: (s: string) => { ok: true; output: string } | { ok: false; error: string }, title: string, intoEditor = false) => {
    const r = fn(rawInput);
    if (!r.ok) { setConvertOutput({ title: 'Error', text: r.error }); return; }
    if (intoEditor) { loadIntoEditor(r.output); setConvertOutput(null); }
    else setConvertOutput({ title, text: r.output });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button className="btn btn-ghost" onClick={() => setOpen((o) => !o)}>Convert ▾</button>
      {open && (
        <div className="absolute left-0 mt-1 surface rounded shadow-lg p-1 z-30 w-44">
          <button className="block w-full text-left px-2 py-1 hover:bg-[var(--accent-soft)] rounded" onClick={() => run(toYamlFromJson, 'YAML')}>To YAML</button>
          <button className="block w-full text-left px-2 py-1 hover:bg-[var(--accent-soft)] rounded" onClick={() => run(toCsvFromJson, 'CSV')}>To CSV</button>
          <button className="block w-full text-left px-2 py-1 hover:bg-[var(--accent-soft)] rounded" onClick={() => run(toJsonFromYaml, '', true)}>From YAML</button>
          <button className="block w-full text-left px-2 py-1 hover:bg-[var(--accent-soft)] rounded" onClick={() => run(toJsonFromCsv, '', true)}>From CSV</button>
        </div>
      )}
    </div>
  );
}
