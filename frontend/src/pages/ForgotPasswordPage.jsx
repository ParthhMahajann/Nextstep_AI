/**
 * Forgot Password page — 2026 dark glassmorphism design
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle, ArrowRight, Zap } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const { forgotPassword, isLoading } = useAuthStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        await forgotPassword(email);
        setSubmitted(true);
    };

    return (
        <div className="auth-page">
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="auth-card"
                style={{ width: '100%', maxWidth: 420 }}
            >
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div className="logo-mark" style={{ width: 36, height: 36, borderRadius: 11 }}>
                            <Zap size={18} color="#fff" strokeWidth={2.5} />
                        </div>
                        <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                            NextStep<span className="text-gradient">AI</span>
                        </span>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '36px 32px', textAlign: 'center' }}>
                    <AnimatePresence mode="wait">
                        {!submitted ? (
                            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                {/* Icon */}
                                <div style={{
                                    width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
                                    background: 'rgba(230,0,35,0.08)', border: '1px solid rgba(230,0,35,0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Mail size={28} color="#e60023" />
                                </div>

                                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                                    Forgot your password?
                                </h1>
                                <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
                                    Enter your email and we'll send you a reset link.
                                </p>

                                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
                                    <div style={{ position: 'relative' }}>
                                        <Mail size={16} color="var(--text-muted)"
                                            style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                        <input
                                            type="email"
                                            className="input"
                                            style={{ paddingLeft: 44 }}
                                            placeholder="Your email address"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            autoComplete="email"
                                            required
                                        />
                                    </div>
                                    <button type="submit" disabled={isLoading} className="btn btn-primary"
                                        style={{ width: '100%', padding: '13px', fontSize: 15, gap: 8, marginTop: 4 }}>
                                        {isLoading ? (
                                            <>
                                                <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%' }} className="animate-spin" />
                                                Sending…
                                            </>
                                        ) : (
                                            <>Send reset link <ArrowRight size={16} /></>
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div key="sent" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                                <div style={{
                                    width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
                                    background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <CheckCircle size={34} color="#4ade80" />
                                </div>
                                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                    Check your email
                                </h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}>
                                    If <strong style={{ color: 'var(--text-primary)' }}>{email}</strong> is registered,
                                    you'll receive a reset link shortly.
                                </p>
                                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>
                                    The link expires in 1 hour.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f0f0f0' }}>
                        <Link to="/login" style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            color: 'var(--text-muted)', fontSize: 14, textDecoration: 'none',
                            transition: 'color 0.2s',
                        }}
                            onMouseOver={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                            onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                            <ArrowLeft size={14} /> Back to Login
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
