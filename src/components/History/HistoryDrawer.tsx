import { useStore } from '../../store';
import { formatRelativeTime } from '../../lib/history';

export default function HistoryDrawer() {
  const { history, historyOpen, loadHistoryItem, removeHistory, clearAllHistory } = useStore();

  if (!historyOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex" role="dialog" aria-label="History">
      <div className="flex-1 bg-black/40" onClick={() => useStore.getState().toggleHistory()} />
      <aside className="surface w-full max-w-sm h-full overflow-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">History</h2>
          <button className="btn btn-danger" onClick={() => { if (confirm('Clear all history?')) clearAllHistory(); }}>Clear All</button>
        </div>
        {history.length === 0 ? (
          <p className="text-muted">No history yet.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="surface-2 rounded p-2 cursor-pointer hover:brightness-125"
                  onClick={() => loadHistoryItem(h.id)}>
                <div className="flex justify-between items-center">
                  <span className="text-faint text-xs">{formatRelativeTime(h.timestamp, Date.now())}</span>
                  <button className="text-[var(--error)] px-1" aria-label="✕" onClick={(e) => { e.stopPropagation(); removeHistory(h.id); }}>✕</button>
                </div>
                <pre className="truncate text-xs mt-1">{h.preview}</pre>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
