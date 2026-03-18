import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import AuthPage from './components/AuthPage.jsx';
import GameDashboard from './components/GameDashboard.jsx';

function AppInner() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', color: 'var(--muted)', fontSize: '16px',
      }}>
        Loading…
      </div>
    );
  }

  return isAuthenticated ? <GameDashboard /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
