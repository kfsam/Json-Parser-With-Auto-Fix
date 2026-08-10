import { useStore } from '../store';
import ThemeSwitcher from './ThemeSwitcher';

export default function Header() {
  const toggleHistory = useStore((s) => s.toggleHistory);
  return (
    <header className="flex items-center justify-between p-4 gap-3 flex-wrap">
      <h1 className="text-xl font-bold flex items-center gap-2"><span className="text-[var(--accent)]">{'{ }'}</span> JSON Parser</h1>
      <div className="flex items-center gap-2">
        <ThemeSwitcher />
        <button className="btn btn-ghost" onClick={toggleHistory} aria-label="History">☰</button>
      </div>
    </header>
  );
}
