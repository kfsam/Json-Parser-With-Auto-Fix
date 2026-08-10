import { ThemeProvider } from './theme/ThemeContext';
import { useStore } from './store';
import Header from './components/Header';
import CodeEditor from './components/Editor/CodeEditor';
import Toolbar from './components/Editor/Toolbar';
import FileDrop from './components/Editor/FileDrop';
import OutputPanel from './components/Output/OutputPanel';
import HistoryDrawer from './components/History/HistoryDrawer';

export default function App() {
  return (
    <ThemeProvider>
      <div className="h-full flex flex-col">
        <Header />
        <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3 p-3">
          <section className="surface rounded-lg flex flex-col min-h-[300px] overflow-hidden">
            <FileDrop>
              <div className="flex-1 min-h-0"><CodeEditor /></div>
            </FileDrop>
            <Toolbar />
          </section>
          <section className="min-h-[300px]">
            <OutputPanel />
          </section>
        </main>
        <HistoryDrawer />
      </div>
    </ThemeProvider>
  );
}
