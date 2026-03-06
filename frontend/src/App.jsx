/**
 * Main App component with routing
 */

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';

// Pages
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { SavedJobsPage } from './pages/SavedJobsPage';
import { ResumeAnalyzerPage } from './pages/ResumeAnalyzerPage';
import { VerifyEmailSentPage } from './pages/VerifyEmailSentPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

const queryClient = new QueryClient();

// Redirect authenticated users away from auth pages
function AuthRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Navigate to="/discover" replace /> : children;
}

// Require authentication
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppContent() {
  const { fetchUser, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token && !isAuthenticated) fetchUser();
  }, [fetchUser, isAuthenticated]);

  return (
    <Routes>
      {/* ── Auth routes (redirect if already logged in) ── */}
      <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
      <Route path="/signup" element={<AuthRoute><SignupPage /></AuthRoute>} />

      {/* ── Email verification & password reset (always public) ── */}
      <Route path="/verify-email-sent" element={<VerifyEmailSentPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* ── Protected routes ── */}
      <Route path="/discover" element={<ProtectedRoute><DiscoverPage /></ProtectedRoute>} />
      <Route path="/saved" element={<ProtectedRoute><SavedJobsPage /></ProtectedRoute>} />
      <Route path="/resume-analyzer" element={<ProtectedRoute><ResumeAnalyzerPage /></ProtectedRoute>} />

      {/* ── Fallback ── */}
      <Route path="/" element={<Navigate to="/discover" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
