import { useRef, useState, type ReactNode } from 'react';
import { useStore } from '../../store';
import { safeParse } from '../../lib/json';

export default function FileDrop({ children }: { children: ReactNode }) {
  const loadIntoEditor = useStore((s) => s.loadIntoEditor);
  const setConvertOutput = useStore((s) => s.setConvertOutput);
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const r = safeParse(text);
      if (!r.ok) { setConvertOutput({ title: 'Import error', text: 'File is not valid JSON: ' + r.error.message }); return; }
      loadIntoEditor(JSON.stringify(r.value, null, 2));
      setConvertOutput(null);
    };
    reader.onerror = () => setConvertOutput({ title: 'Import error', text: 'Could not read file.' });
    reader.readAsText(file);
  };

  return (
    <div
      className={`relative h-full ${over ? 'ring-2 ring-[var(--accent)]' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
    >
      {children}
      <input ref={inputRef} type="file" accept=".json,application/json" className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
      <button className="btn btn-ghost absolute bottom-2 right-2 z-10" onClick={() => inputRef.current?.click()}>Import</button>
    </div>
  );
}
