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

// Create query client
const queryClient = new QueryClient();

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Auth route (redirect if already logged in)
function AuthRoute({ children }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/discover" replace />;
  }

  return children;
}

function AppContent() {
  const { fetchUser, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Check if we have a token and fetch user
    const token = localStorage.getItem('access_token');
    if (token && !isAuthenticated) {
      fetchUser();
    }
  }, [fetchUser, isAuthenticated]);

  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/login" element={
        <AuthRoute>
          <LoginPage />
        </AuthRoute>
      } />
      <Route path="/signup" element={
        <AuthRoute>
          <SignupPage />
        </AuthRoute>
      } />

      {/* Protected routes */}
      <Route path="/discover" element={
        <ProtectedRoute>
          <DiscoverPage />
        </ProtectedRoute>
      } />
      <Route path="/saved" element={
        <ProtectedRoute>
          <SavedJobsPage />
        </ProtectedRoute>
      } />
      <Route path="/resume-analyzer" element={
        <ProtectedRoute>
          <ResumeAnalyzerPage />
        </ProtectedRoute>
      } />

      {/* Redirect root to discover or login */}
      <Route path="/" element={<Navigate to="/discover" replace />} />

      {/* 404 fallback */}
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
