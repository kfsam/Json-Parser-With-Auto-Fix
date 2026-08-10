import { useStore } from '../../store';
import ConvertMenu from '../ConvertMenu';

export default function Toolbar() {
  const { parse, reformat, minify, autoFix, clear } = useStore();
  return (
    <div className="flex flex-wrap gap-2 p-2 surface-2 border-t border-[var(--border)]">
      <button className="btn btn-accent" onClick={parse}>Parse JSON</button>
      <button className="btn btn-ghost" onClick={reformat}>Format</button>
      <button className="btn btn-ghost" onClick={minify}>Minify</button>
      <button className="btn btn-ghost" onClick={autoFix}>Auto Fix</button>
      <button className="btn btn-ghost" onClick={clear}>Clear</button>
      <ConvertMenu />
    </div>
  );
}
