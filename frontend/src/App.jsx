/**
 * Main App — routing, global providers, animated bg
 */

import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from './store/authStore';
import { ToastProvider } from './components/Toast';
import { NavBar } from './components/NavBar';
import { SideNav } from './components/SideNav';
import { AIChatWidget } from './components/AIChatWidget';
import { OnboardingModal } from './components/OnboardingModal';

// Pages
import { LandingPage }          from './pages/LandingPage';
import { LoginPage }            from './pages/LoginPage';
import { SignupPage }           from './pages/SignupPage';
import { DiscoverPage }         from './pages/DiscoverPage';
import { SavedJobsPage }        from './pages/SavedJobsPage';
import { ResumeAnalyzerPage }   from './pages/ResumeAnalyzerPage';
import { ProfilePage }          from './pages/ProfilePage';
import { KanbanPage }           from './pages/KanbanPage';
import { AnalyticsPage }        from './pages/AnalyticsPage';
import { SettingsPage }         from './pages/SettingsPage';
import { VerifyEmailSentPage }  from './pages/VerifyEmailSentPage';
import { VerifyEmailPage }      from './pages/VerifyEmailPage';
import { ForgotPasswordPage }   from './pages/ForgotPasswordPage';
import { ResetPasswordPage }    from './pages/ResetPasswordPage';

const queryClient = new QueryClient();

const PROTECTED_PATHS = ['/discover', '/saved', '/resume-analyzer', '/profile', '/tracker', '/analytics', '/settings'];

function AuthRoute({ children }) {
    const { isAuthenticated } = useAuthStore();
    return isAuthenticated ? <Navigate to="/discover" replace /> : children;
}

function ProtectedRoute({ children }) {
    const { isAuthenticated } = useAuthStore();
    return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppContent() {
    const { fetchUser, logout, isAuthenticated } = useAuthStore();
    const { pathname } = useLocation();
    const showNav = isAuthenticated && PROTECTED_PATHS.includes(pathname);
    const [showOnboarding, setShowOnboarding] = useState(false);

    // On every mount: verify the stored token is still valid and load user data.
    // If there's no token but Zustand thinks we're authenticated (stale persist),
    // clear auth state so the user is redirected to login cleanly.
    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            fetchUser(); // verifies token, loads user + profile
        } else if (isAuthenticated) {
            logout(); // stale persist state with no real token → clear it
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (isAuthenticated && !localStorage.getItem('nextstep_onboarded')) {
            setShowOnboarding(true);
        }
    }, [isAuthenticated]);

    return (
        <>
            {/* Mesh bg — only behind app pages, not landing */}
            {pathname !== '/' && (
                <div className="mesh-bg">
                    <div className="mesh-orb" />
                </div>
            )}

            {/* Desktop sidebar */}
            {showNav && <SideNav />}

            <Routes>
                {/* Landing */}
                <Route path="/" element={isAuthenticated ? <Navigate to="/discover" replace /> : <LandingPage />} />

                {/* Auth routes */}
                <Route path="/login"   element={<AuthRoute><LoginPage /></AuthRoute>} />
                <Route path="/signup"  element={<AuthRoute><SignupPage /></AuthRoute>} />

                {/* Public */}
                <Route path="/verify-email-sent" element={<VerifyEmailSentPage />} />
                <Route path="/verify-email"      element={<VerifyEmailPage />} />
                <Route path="/forgot-password"   element={<ForgotPasswordPage />} />
                <Route path="/reset-password"    element={<ResetPasswordPage />} />

                {/* Protected */}
                <Route path="/discover"         element={<ProtectedRoute><DiscoverPage /></ProtectedRoute>} />
                <Route path="/profile"          element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/saved"            element={<ProtectedRoute><SavedJobsPage /></ProtectedRoute>} />
                <Route path="/resume-analyzer"  element={<ProtectedRoute><ResumeAnalyzerPage /></ProtectedRoute>} />
                <Route path="/tracker"          element={<ProtectedRoute><KanbanPage /></ProtectedRoute>} />
                <Route path="/analytics"        element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
                <Route path="/settings"         element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Mobile bottom nav */}
            {showNav && <NavBar />}
            {isAuthenticated && <AIChatWidget />}

            <AnimatePresence>
                {showOnboarding && <OnboardingModal onDone={() => setShowOnboarding(false)} />}
            </AnimatePresence>
        </>
    );
}

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <ToastProvider>
                <BrowserRouter>
                    <AppContent />
                </BrowserRouter>
            </ToastProvider>
        </QueryClientProvider>
    );
}
