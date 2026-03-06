/**
 * "Check your inbox" screen shown immediately after signup.
 * Reads pendingVerificationEmail from auth store and offers a resend button.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, RefreshCw, ArrowLeft, CheckCircle } from 'lucide-react';
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
        <div className="min-h-screen flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ width: '100%', maxWidth: '440px' }}
            >
                <div className="glass" style={{ borderRadius: '20px', padding: '44px 36px', textAlign: 'center' }}>
                    {/* Icon */}
                    <div style={{
                        width: 72, height: 72, borderRadius: '50%', margin: '0 auto 24px',
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
                        border: '2px solid rgba(99,102,241,0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Mail size={32} color="#a5b4fc" />
                    </div>

                    <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>
                        Check your inbox!
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: 1.6, marginBottom: '8px' }}>
                        We sent a verification link to
                    </p>
                    {pendingVerificationEmail && (
                        <p style={{
                            color: '#a5b4fc', fontWeight: 600, fontSize: '15px', marginBottom: '24px',
                            padding: '8px 16px', borderRadius: '8px', background: 'rgba(99,102,241,0.1)',
                            display: 'inline-block',
                        }}>
                            {pendingVerificationEmail}
                        </p>
                    )}
                    <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '32px' }}>
                        Click the link in the email to activate your account. The link expires in 24 hours.
                    </p>

                    {/* Resend */}
                    {sent ? (
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            color: '#22c55e', fontWeight: 600, marginBottom: '20px',
                        }}>
                            <CheckCircle size={18} /> Email resent!
                        </div>
                    ) : (
                        <button
                            onClick={handleResend}
                            disabled={sending || !pendingVerificationEmail}
                            className="btn btn-outline"
                            style={{ width: '100%', marginBottom: '16px', gap: '8px' }}>
                            <RefreshCw size={16} className={sending ? 'animate-spin' : ''} />
                            {sending ? 'Sending…' : 'Resend verification email'}
                        </button>
                    )}

                    <Link to="/login" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        color: '#64748b', fontSize: '14px', textDecoration: 'none',
                    }}>
                        <ArrowLeft size={14} /> Back to Login
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
