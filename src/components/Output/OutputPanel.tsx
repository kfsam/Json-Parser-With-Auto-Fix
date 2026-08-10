import { useStore } from '../../store';
import TextView from './TextView';
import TreeView from './TreeView';
import PathFinder from '../PathFinder/PathFinder';

export default function OutputPanel() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const parseError = useStore((s) => s.parseError);
  const convertOutput = useStore((s) => s.convertOutput);

  return (
    <div className="surface rounded-lg flex flex-col h-full overflow-hidden">
      <div className="flex gap-2 p-2 surface-2 border-b border-[var(--border)]">
        <button className={`btn ${view === 'text' ? 'btn-accent' : 'btn-ghost'}`} onClick={() => setView('text')}>Text</button>
        <button className={`btn ${view === 'tree' ? 'btn-accent' : 'btn-ghost'}`} onClick={() => setView('tree')}>Tree</button>
      </div>
      {convertOutput ? (
        <div className="p-4 overflow-auto">
          <div className="text-muted text-sm mb-2">{convertOutput.title}</div>
          <pre className="text-sm whitespace-pre-wrap">{convertOutput.text}</pre>
        </div>
      ) : parseError ? (
        <div className="p-4 text-[var(--error)]">JSON Parse Error: {parseError.message}{parseError.line > 0 ? ` (line ${parseError.line}, col ${parseError.col})` : ''}</div>
      ) : (
        <div className="flex-1 overflow-auto">{view === 'text' ? <TextView /> : <><TreeView />{view === 'tree' && <PathFinder />}</>}</div>
      )}
    </div>
  );
}
