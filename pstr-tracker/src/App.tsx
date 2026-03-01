import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RecordsPage } from './pages/RecordsPage';
import { RecordDetailPage } from './pages/RecordDetailPage';
import { PatronsPage } from './pages/PatronsPage';
import { ImportPage } from './pages/ImportPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { UsersPage } from './pages/UsersPage';
import { AmlcRequestsPage } from './pages/AmlcRequestsPage';
import { SettingsPage } from './pages/SettingsPage';
import './styles/solaire-tokens.css';
import './styles/components.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/records" element={<RecordsPage />} />
                  <Route path="/records/new" element={<RecordDetailPage />} />
                  <Route path="/records/:id" element={<RecordDetailPage />} />
                  <Route path="/patrons" element={<PatronsPage />} />
                  <Route path="/import" element={<ImportPage />} />
                  <Route path="/amlc-requests" element={<AmlcRequestsPage />} />
                  <Route path="/audit-log" element={<AuditLogPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
