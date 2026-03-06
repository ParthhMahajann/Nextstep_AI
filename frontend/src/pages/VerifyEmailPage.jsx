/**
 * Email verification page — reads ?token= from URL and calls the API.
 */

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader, ArrowRight, RefreshCw } from 'lucide-react';
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
        <div className="min-h-screen flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ width: '100%', maxWidth: '440px' }}
            >
                <div className="glass" style={{ borderRadius: '20px', padding: '48px 36px', textAlign: 'center' }}>
                    {status === 'loading' && (
                        <>
                            <Loader size={48} color="#6366f1" className="animate-spin" style={{ margin: '0 auto 20px' }} />
                            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700 }}>Verifying your email…</h2>
                            <p style={{ color: '#94a3b8', marginTop: '8px' }}>Just a moment</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div style={{
                                width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
                                background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.4)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <CheckCircle size={36} color="#22c55e" />
                            </div>
                            <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>
                                Email Verified! 🎉
                            </h2>
                            <p style={{ color: '#94a3b8', marginBottom: '32px', lineHeight: 1.6 }}>
                                Your account is now active. Sign in to start exploring opportunities.
                            </p>
                            <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex', gap: '8px', textDecoration: 'none' }}>
                                Go to Login <ArrowRight size={18} />
                            </Link>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div style={{
                                width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
                                background: 'rgba(239,68,68,0.15)', border: '2px solid rgba(239,68,68,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <XCircle size={36} color="#ef4444" />
                            </div>
                            <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>
                                Verification Failed
                            </h2>
                            <p style={{ color: '#94a3b8', marginBottom: '28px', lineHeight: 1.6 }}>{message}</p>

                            {pendingVerificationEmail && !resent && (
                                <button onClick={handleResend} className="btn btn-outline" style={{ width: '100%', gap: '8px', marginBottom: '16px' }}>
                                    <RefreshCw size={16} /> Resend verification email
                                </button>
                            )}
                            {resent && (
                                <p style={{ color: '#22c55e', fontWeight: 600, marginBottom: '16px' }}>
                                    ✓ New verification email sent!
                                </p>
                            )}
                            <Link to="/login" style={{ color: '#94a3b8', fontSize: '14px', textDecoration: 'none' }}>
                                Back to Login
                            </Link>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
