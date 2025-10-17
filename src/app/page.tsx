import StoryboardEditor from './components/StoryboardEditor';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastContext';

export default function Home() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <StoryboardEditor />
      </ToastProvider>
    </ErrorBoundary>
  );
}
