/**
 * Forgot Password page — user submits email to receive reset link.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle, ArrowRight } from 'lucide-react';
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
        <div className="min-h-screen flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ width: '100%', maxWidth: '420px' }}
            >
                <div className="glass" style={{ borderRadius: '20px', padding: '40px 36px' }}>
                    {!submitted ? (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                                <div style={{
                                    width: 60, height: 60, borderRadius: '50%', margin: '0 auto 16px',
                                    background: 'rgba(99,102,241,0.15)', border: '2px solid rgba(99,102,241,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Mail size={28} color="#a5b4fc" />
                                </div>
                                <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
                                    Forgot your password?
                                </h1>
                                <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6 }}>
                                    Enter your email and we'll send you a reset link.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} color="#64748b" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        type="email"
                                        className="input"
                                        style={{ paddingLeft: '44px' }}
                                        placeholder="Your email address"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ gap: '8px' }}>
                                    {isLoading ? 'Sending…' : <>Send reset link <ArrowRight size={18} /></>}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: 68, height: 68, borderRadius: '50%', margin: '0 auto 20px',
                                background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.4)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <CheckCircle size={34} color="#22c55e" />
                            </div>
                            <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>
                                Check your email
                            </h2>
                            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, marginBottom: '8px' }}>
                                If <strong style={{ color: '#cbd5e1' }}>{email}</strong> is registered, you'll receive a password reset link shortly.
                            </p>
                            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '28px' }}>
                                The link expires in 1 hour.
                            </p>
                        </div>
                    )}

                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '14px', textDecoration: 'none' }}>
                            <ArrowLeft size={14} /> Back to Login
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
