/**
 * Reset Password page — reads ?token= from URL, lets user set a new password.
 */

import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle, ArrowRight } from 'lucide-react';
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

    const inputStyle = {
        width: '100%', padding: '13px 16px 13px 44px',
        background: 'rgba(15,23,42,0.6)',
        border: '2px solid rgba(255,255,255,0.1)',
        borderRadius: '12px', color: 'white', fontSize: '15px', outline: 'none',
    };

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
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="glass" style={{ borderRadius: '20px', padding: '40px', textAlign: 'center', maxWidth: '400px' }}>
                    <p style={{ color: '#ef4444', marginBottom: '16px' }}>Invalid reset link. Please request a new one.</p>
                    <Link to="/forgot-password" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                        Request Reset Link
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ width: '100%', maxWidth: '420px' }}
            >
                <div className="glass" style={{ borderRadius: '20px', padding: '40px 36px' }}>
                    {success ? (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: 68, height: 68, borderRadius: '50%', margin: '0 auto 20px',
                                background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.4)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <CheckCircle size={34} color="#22c55e" />
                            </div>
                            <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>Password reset!</h2>
                            <p style={{ color: '#94a3b8', fontSize: '14px' }}>Redirecting you to login…</p>
                        </div>
                    ) : (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                                <div style={{
                                    width: 60, height: 60, borderRadius: '50%', margin: '0 auto 16px',
                                    background: 'rgba(99,102,241,0.15)', border: '2px solid rgba(99,102,241,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Lock size={28} color="#a5b4fc" />
                                </div>
                                <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
                                    Set new password
                                </h1>
                                <p style={{ color: '#94a3b8', fontSize: '14px' }}>Choose a strong password for your account.</p>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} color="#64748b" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        style={{ ...inputStyle, paddingRight: '48px' }}
                                        placeholder="New password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                    />
                                    <button type="button" onClick={() => setShowPw(v => !v)}
                                        style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} color="#64748b" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        style={inputStyle}
                                        placeholder="Confirm new password"
                                        value={passwordConfirm}
                                        onChange={e => setPasswordConfirm(e.target.value)}
                                        required
                                    />
                                </div>

                                {(localError || error) && (
                                    <div style={{
                                        padding: '10px 14px', borderRadius: '10px',
                                        background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                                        color: '#f87171', fontSize: '14px',
                                    }}>
                                        {localError || (typeof error === 'string' ? error : 'Reset failed.')}
                                    </div>
                                )}

                                <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ gap: '8px' }}>
                                    {isLoading ? 'Resetting…' : <>Reset Password <ArrowRight size={18} /></>}
                                </button>
                            </form>

                            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                <Link to="/login" style={{ color: '#64748b', fontSize: '14px', textDecoration: 'none' }}>
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
