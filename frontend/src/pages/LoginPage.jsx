/**
 * Premium Login page — NextStep AI
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Briefcase, Mail, Lock, ArrowRight, Eye, EyeOff,
    Sparkles, Target, Zap
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const features = [
    { icon: Sparkles, text: 'AI-powered job matching' },
    { icon: Target, text: 'Personalised recommendations' },
    { icon: Zap, text: 'Smart resume analysis' },
];

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const { login, isLoading, error, clearError } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        clearError();
        const success = await login(email, password);
        if (success) navigate('/discover');
    };

    return (
        <div className="min-h-screen flex">
            {/* ── Left panel (branding) ─────────────────────── */}
            <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
                }}
            >
                {/* Background blobs */}
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: 'radial-gradient(circle at 20% 20%, rgba(99,102,241,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139,92,246,0.3) 0%, transparent 50%)',
                }} />

                <div className="relative">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                            <Briefcase size={22} className="text-white" />
                        </div>
                        <span className="text-2xl font-bold text-white">NextStep AI</span>
                    </div>
                </div>

                <div className="relative">
                    <h2 className="text-4xl font-bold text-white leading-tight mb-4">
                        Your next opportunity<br />
                        <span style={{ background: 'linear-gradient(135deg, #a5b4fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            is one step away
                        </span>
                    </h2>
                    <p className="text-indigo-200 text-lg mb-10">
                        Join thousands of candidates finding their dream jobs with AI-powered matching.
                    </p>

                    <div className="space-y-4">
                        {features.map(({ icon: Icon, text }) => (
                            <div key={text} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                                    <Icon size={16} className="text-indigo-300" />
                                </div>
                                <span className="text-indigo-100">{text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="relative text-indigo-300 text-sm">© 2026 NextStep AI. All rights reserved.</p>
            </motion.div>

            {/* ── Right panel (form) ──────────────────────────── */}
            <div className="flex-1 flex items-center justify-center p-8">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="w-full max-w-md"
                >
                    {/* Mobile logo */}
                    <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
                        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                            <Briefcase size={22} className="text-white" />
                        </div>
                        <span className="text-2xl font-bold text-white">NextStep AI</span>
                    </div>

                    <div className="glass rounded-2xl p-8">
                        <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
                        <p className="text-slate-400 mb-8">Sign in to continue your journey</p>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Email */}
                            <div className="relative group">
                                <Mail
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors"
                                    size={20}
                                />
                                <input
                                    id="login-email"
                                    type="email"
                                    placeholder="Email address"
                                    className="input pl-12"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                />
                            </div>

                            {/* Password */}
                            <div className="relative group">
                                <Lock
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors"
                                    size={20}
                                />
                                <input
                                    id="login-password"
                                    type={showPw ? 'text' : 'password'}
                                    placeholder="Password"
                                    className="input pl-12 pr-12"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(v => !v)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            <div className="flex justify-end">
                                <Link
                                    to="/forgot-password"
                                    className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    Forgot password?
                                </Link>
                            </div>

                            {/* Error */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-3 rounded-xl"
                                    style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
                                >
                                    <p className="text-red-400 text-sm text-center">
                                        {typeof error === 'string' ? error : 'Invalid credentials'}
                                    </p>
                                </motion.div>
                            )}

                            <button
                                id="login-submit"
                                type="submit"
                                disabled={isLoading}
                                className="btn btn-primary w-full gap-2"
                                style={{ padding: '14px 24px', fontSize: '16px' }}
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Signing in…
                                    </>
                                ) : (
                                    <>Sign In <ArrowRight size={18} /></>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 text-center">
                            <p className="text-slate-400">
                                Don't have an account?{' '}
                                <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                                    Create one free
                                </Link>
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
