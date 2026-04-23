/**
 * "Check your inbox" screen — Pinterest light theme
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, RefreshCw, ArrowLeft, CheckCircle, Zap } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function VerifyEmailSentPage() {
    const { pendingVerificationEmail, resendVerification } = useAuthStore();
    const [sent, setSent] = useState(false);
    const [sending, setSending] = useState(false);

    const handleResend = async () => {
        if (!pendingVerificationEmail) return;
        setSending(true);
        await resendVerification(pendingVerificationEmail);
        setSending(false);
        setSent(true);
        setTimeout(() => setSent(false), 4000);
    };

    return (
        <div style={{
            minHeight: '100dvh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24, position: 'relative', zIndex: 1,
        }}>
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
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

                <div className="glass-card" style={{ padding: '44px 36px', textAlign: 'center' }}>
                    {/* Animated mail icon */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                        style={{
                            width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px',
                            background: 'rgba(230,0,35,0.08)', border: '1px solid rgba(230,0,35,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <Mail size={34} color="#e60023" />
                    </motion.div>

                    <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                        Check your inbox!
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, marginBottom: 8 }}>
                        We sent a verification link to
                    </p>
                    {pendingVerificationEmail && (
                        <div style={{
                            display: 'inline-block', padding: '8px 16px', borderRadius: 10, marginBottom: 20,
                            background: 'rgba(230,0,35,0.06)', border: '1px solid rgba(230,0,35,0.15)',
                            color: '#e60023', fontWeight: 600, fontSize: 15,
                        }}>
                            {pendingVerificationEmail}
                        </div>
                    )}
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 32 }}>
                        Click the link in the email to activate your account. The link expires in 24 hours.
                    </p>

                    {/* Resend */}
                    <AnimatePresence mode="wait">
                        {sent ? (
                            <motion.div
                                key="sent"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#00a86b', fontWeight: 600, marginBottom: 20, fontSize: 15 }}
                            >
                                <CheckCircle size={18} /> Email resent!
                            </motion.div>
                        ) : (
                            <motion.button
                                key="btn"
                                onClick={handleResend}
                                disabled={sending || !pendingVerificationEmail}
                                style={{
                                    width: '100%', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    padding: '12px 20px', borderRadius: 14, cursor: (sending || !pendingVerificationEmail) ? 'not-allowed' : 'pointer',
                                    background: '#f3f3f3', border: '1px solid #e1e1e1',
                                    color: 'var(--text-secondary)', fontWeight: 600, fontSize: 14,
                                    opacity: (sending || !pendingVerificationEmail) ? 0.5 : 1,
                                    transition: 'all 0.2s',
                                }}
                                whileHover={!sending && pendingVerificationEmail ? { background: '#ebebeb' } : {}}
                            >
                                <RefreshCw size={15} style={{ animation: sending ? 'spin 0.8s linear infinite' : 'none' }} />
                                {sending ? 'Sending…' : 'Resend verification email'}
                            </motion.button>
                        )}
                    </AnimatePresence>

                    <Link to="/login" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        color: 'var(--text-muted)', fontSize: 14, textDecoration: 'none',
                    }}
                        onMouseOver={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                        onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                        <ArrowLeft size={14} /> Back to Login
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
