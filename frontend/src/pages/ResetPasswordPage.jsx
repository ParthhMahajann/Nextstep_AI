/**
 * Reset Password page — 2026 dark glassmorphism design
 */

import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle, ArrowRight, Zap } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const { resetPassword, isLoading, error, clearError } = useAuthStore();

    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [localError, setLocalError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        clearError();
        setLocalError('');
        if (password.length < 8) { setLocalError('Password must be at least 8 characters.'); return; }
        if (password !== passwordConfirm) { setLocalError('Passwords do not match.'); return; }
        if (!token) { setLocalError('Invalid or missing reset token.'); return; }

        const result = await resetPassword(token, password, passwordConfirm);
        if (result.success) {
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2500);
        } else {
            setLocalError(result.message || 'Reset failed. The link may have expired.');
        }
    };

    if (!token) {
        return (
            <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', zIndex: 1 }}>
                <div className="glass-card" style={{ padding: 40, textAlign: 'center', maxWidth: 400, width: '100%' }}>
                    <p style={{ color: '#f87171', marginBottom: 20, fontSize: 15 }}>
                        Invalid reset link. Please request a new one.
                    </p>
                    <Link to="/forgot-password" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                        Request Reset Link
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100dvh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24, position: 'relative', zIndex: 1,
        }}>
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                style={{ width: '100%', maxWidth: 420 }}
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

                <div className="glass-card" style={{ padding: '36px 32px', textAlign: 'center' }}>
                    {success ? (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                            <div style={{
                                width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
                                background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <CheckCircle size={34} color="#4ade80" />
                            </div>
                            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
                                Password reset!
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Redirecting you to login…</p>
                        </motion.div>
                    ) : (
                        <>
                            <div style={{ marginBottom: 28 }}>
                                <div style={{
                                    width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
                                    background: 'rgba(230,0,35,0.08)', border: '1px solid rgba(230,0,35,0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Lock size={28} color="#e60023" />
                                </div>
                                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                                    Set new password
                                </h1>
                                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                                    Choose a strong password for your account.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={16} color="var(--text-muted)"
                                        style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        className="input"
                                        style={{ paddingLeft: 44, paddingRight: 48 }}
                                        placeholder="New password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                    />
                                    <button type="button" onClick={() => setShowPw(v => !v)}
                                        style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
                                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={16} color="var(--text-muted)"
                                        style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        className="input"
                                        style={{ paddingLeft: 44 }}
                                        placeholder="Confirm new password"
                                        value={passwordConfirm}
                                        onChange={e => setPasswordConfirm(e.target.value)}
                                        required
                                    />
                                </div>

                                {(localError || error) && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--error-bg)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: 13 }}
                                    >
                                        {localError || (typeof error === 'string' ? error : 'Reset failed.')}
                                    </motion.div>
                                )}

                                <button type="submit" disabled={isLoading} className="btn btn-primary"
                                    style={{ width: '100%', padding: '13px', fontSize: 15, gap: 8, marginTop: 4 }}>
                                    {isLoading ? (
                                        <>
                                            <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%' }} className="animate-spin" />
                                            Resetting…
                                        </>
                                    ) : (
                                        <>Reset Password <ArrowRight size={16} /></>
                                    )}
                                </button>
                            </form>

                            <div style={{ marginTop: 20 }}>
                                <Link to="/login" style={{ color: 'var(--text-muted)', fontSize: 14, textDecoration: 'none' }}
                                    onMouseOver={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                                    onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                                >
                                    Back to Login
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
