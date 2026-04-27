/**
 * Login page — 2026 dark glassmorphism design
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Zap } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function LoginPage() {
    const navigate = useNavigate();
    const { login, isLoading, error, clearError } = useAuthStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        clearError();
        const success = await login(email, password);
        if (success) navigate('/discover');
    };

    return (
        <div className="auth-page">
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="auth-card"
                style={{ width: '100%', maxWidth: '420px' }}
            >
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}
                    >
                        <div className="logo-mark">
                            <Zap size={22} color="#fff" strokeWidth={2.5} />
                        </div>
                        <span style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                            NextStep<span className="text-gradient">AI</span>
                        </span>
                    </motion.div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                        Your AI-powered career companion
                    </p>
                </div>

                {/* Card */}
                <div className="glass-card" style={{ padding: '36px 32px' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                        Welcome back
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '28px' }}>
                        Sign in to your account
                    </p>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Email */}
                        <div style={{ position: 'relative' }}>
                            <Mail
                                size={16}
                                color="var(--text-muted)"
                                style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                            />
                            <input
                                type="email"
                                className="input"
                                style={{ paddingLeft: '44px' }}
                                placeholder="Email address"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                autoComplete="email"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div style={{ position: 'relative' }}>
                            <Lock
                                size={16}
                                color="var(--text-muted)"
                                style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                            />
                            <input
                                type={showPw ? 'text' : 'password'}
                                className="input"
                                style={{ paddingLeft: '44px', paddingRight: '48px' }}
                                placeholder="Password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw(v => !v)}
                                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}
                            >
                                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>

                        {/* Error */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    background: 'var(--error-bg)',
                                    border: '1px solid rgba(239,68,68,0.25)',
                                    color: '#f87171',
                                    fontSize: '13px',
                                }}
                            >
                                {typeof error === 'string' ? error : 'Invalid credentials.'}
                            </motion.div>
                        )}

                        {/* Forgot */}
                        <div style={{ textAlign: 'right', marginTop: '-4px' }}>
                            <Link to="/forgot-password" style={{ color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none' }}
                                onMouseOver={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                                onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                                Forgot password?
                            </Link>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: '4px', fontSize: '15px', padding: '14px' }}
                        >
                            {isLoading ? (
                                <>
                                    <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%' }} className="animate-spin" />
                                    Signing in…
                                </>
                            ) : (
                                <>Sign in <ArrowRight size={16} /></>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="divider" style={{ margin: '24px 0' }}>or</div>

                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                        Don't have an account?{' '}
                        <Link to="/signup" style={{ color: '#e60023', fontWeight: 600, textDecoration: 'none' }}
                            onMouseOver={e => e.currentTarget.style.color = '#ad081b'}
                            onMouseOut={e => e.currentTarget.style.color = '#e60023'}
                        >
                            Create account →
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
