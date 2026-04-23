/**
 * Email verification page — 2026 dark glassmorphism design
 */

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, ArrowRight, RefreshCw, Zap } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState('loading'); // loading | success | error
    const [message, setMessage] = useState('');
    const [resent, setResent] = useState(false);
    const { verifyEmail, pendingVerificationEmail, resendVerification } = useAuthStore();

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('No verification token found in the link. Please check your email.');
            return;
        }
        verifyEmail(token).then(result => {
            if (result.success) {
                setStatus('success');
            } else {
                setStatus('error');
                setMessage(result.message || 'Verification failed. The link may have expired.');
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const handleResend = async () => {
        if (!pendingVerificationEmail) return;
        await resendVerification(pendingVerificationEmail);
        setResent(true);
    };

    return (
        <div style={{
            minHeight: '100dvh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24, position: 'relative', zIndex: 1,
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                style={{ width: '100%', maxWidth: 440 }}
            >
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                        <div className="logo-mark" style={{ width: 36, height: 36, borderRadius: 11 }}>
                            <Zap size={18} color="#fff" strokeWidth={2.5} />
                        </div>
                        <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                            NextStep<span className="text-gradient">AI</span>
                        </span>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '48px 36px', textAlign: 'center' }}>
                    <AnimatePresence mode="wait">
                        {status === 'loading' && (
                            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <div style={{ marginBottom: 24 }}>
                                    <div className="ai-pulse" style={{ justifyContent: 'center' }}>
                                        <div className="ai-pulse-dot" />
                                        <div className="ai-pulse-dot" />
                                        <div className="ai-pulse-dot" />
                                    </div>
                                </div>
                                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                                    Verifying your email…
                                </h2>
                                <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 14 }}>Just a moment</p>
                            </motion.div>
                        )}

                        {status === 'success' && (
                            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                                    style={{
                                        width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px',
                                        background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}
                                >
                                    <CheckCircle size={38} color="#4ade80" />
                                </motion.div>
                                <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                    Email Verified!
                                </h2>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: 32, lineHeight: 1.6, fontSize: 14 }}>
                                    Your account is now active. Sign in to start exploring opportunities.
                                </p>
                                <Link to="/login" className="btn btn-primary"
                                    style={{ display: 'inline-flex', gap: 8, textDecoration: 'none', padding: '13px 28px', fontSize: 15 }}>
                                    Go to Login <ArrowRight size={16} />
                                </Link>
                            </motion.div>
                        )}

                        {status === 'error' && (
                            <motion.div key="error" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                                <div style={{
                                    width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px',
                                    background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <XCircle size={38} color="#f87171" />
                                </div>
                                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                    Verification Failed
                                </h2>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.6, fontSize: 14 }}>
                                    {message}
                                </p>

                                {pendingVerificationEmail && !resent && (
                                    <button onClick={handleResend} style={{
                                        width: '100%', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        padding: '12px 20px', borderRadius: 14, cursor: 'pointer',
                                        background: '#f3f3f3', border: '1px solid #e1e1e1',
                                        color: 'var(--text-secondary)', fontWeight: 600, fontSize: 14,
                                    }}>
                                        <RefreshCw size={15} /> Resend verification email
                                    </button>
                                )}
                                {resent && (
                                    <p style={{ color: '#00a86b', fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                        <CheckCircle size={16} /> New verification email sent!
                                    </p>
                                )}
                                <Link to="/login" style={{ color: 'var(--text-muted)', fontSize: 14, textDecoration: 'none' }}
                                    onMouseOver={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                                    onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                                >
                                    Back to Login
                                </Link>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
