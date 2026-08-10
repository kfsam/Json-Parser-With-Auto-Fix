import { useTheme } from '../theme/ThemeContext';
import type { ThemeName } from '../types';

const OPTIONS: ThemeName[] = ['midnight', 'daylight', 'aurora'];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="inline-flex rounded-lg overflow-hidden border border-[var(--border)]">
      {OPTIONS.map((opt) => (
        <button key={opt} onClick={() => setTheme(opt)}
          className={`px-3 py-1 text-sm capitalize ${theme === opt ? 'bg-[var(--accent)] text-[var(--accent-contrast)]' : 'surface-2 text-muted'}`}>
          {opt}
        </button>
      ))}
    </div>
  );
}
