/**
 * Onboarding modal — shown once on first login to guide new users.
 * Uses localStorage key 'nextstep_onboarded' to track completion.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ScanText, LayoutGrid, BarChart3, Zap, ArrowRight, Check } from 'lucide-react';

const STEPS = [
    {
        icon: Sparkles,
        color: '#e60023',
        bg: 'rgba(230,0,35,0.08)',
        title: 'Welcome to NextStep AI',
        desc: 'Your AI-powered job-hunting assistant. Swipe through jobs, track applications, and let AI handle the heavy lifting.',
    },
    {
        icon: Zap,
        color: '#d97706',
        bg: 'rgba(217,119,6,0.08)',
        title: 'Swipe to Save Jobs',
        desc: 'On the Discover tab, swipe right to save jobs you like, or left to skip. Tap a card to see full details and skill gap analysis.',
    },
    {
        icon: ScanText,
        color: '#1877f2',
        bg: 'rgba(24,119,242,0.08)',
        title: 'AI Resume Tools',
        desc: 'Upload your resume to get instant feedback. Tailor it to any job with one click. Generate cover letters and cold emails in seconds.',
    },
    {
        icon: LayoutGrid,
        color: '#00a86b',
        bg: 'rgba(0,168,107,0.08)',
        title: 'Track Your Pipeline',
        desc: 'Move saved jobs through your application pipeline: Saved → Preparing → Applied → Interviewing → Accepted. Export to CSV anytime.',
    },
    {
        icon: BarChart3,
        color: '#7c3aed',
        bg: 'rgba(124,58,237,0.08)',
        title: 'See Your Analytics',
        desc: 'Track response rates, offer rates, and upcoming interviews in the Analytics tab. The AI chat assistant is always available at the bottom right.',
    },
];

export function OnboardingModal({ onDone }) {
    const [step, setStep] = useState(0);
    const current = STEPS[step];
    const isLast = step === STEPS.length - 1;

    const finish = () => {
        localStorage.setItem('nextstep_onboarded', '1');
        onDone();
    };

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 500 }}
            />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                style={{
                    position: 'fixed', inset: 0, zIndex: 501,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px 16px',
                    pointerEvents: 'none',
                }}
            >
                <div style={{
                    width: '100%', maxWidth: 380,
                    background: '#ffffff',
                    border: '1px solid #e1e1e1',
                    borderRadius: 24,
                    padding: '32px 28px',
                    pointerEvents: 'auto',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
                }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Icon */}
                            <div style={{
                                width: 64, height: 64, borderRadius: 18,
                                background: current.bg,
                                border: `1px solid ${current.color}33`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: 24,
                            }}>
                                <current.icon size={28} color={current.color} />
                            </div>

                            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 12, lineHeight: 1.2 }}>
                                {current.title}
                            </h2>
                            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 32 }}>
                                {current.desc}
                            </p>
                        </motion.div>
                    </AnimatePresence>

                    {/* Step dots */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
                        {STEPS.map((_, i) => (
                            <div
                                key={i}
                                onClick={() => setStep(i)}
                                style={{
                                    height: 4, flex: i === step ? 2 : 1,
                                    borderRadius: 99, cursor: 'pointer',
                                    background: i === step ? '#e60023' : '#e1e1e1',
                                    transition: 'all 0.3s',
                                }}
                            />
                        ))}
                    </div>

                    {/* CTA buttons */}
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button
                            onClick={finish}
                            style={{ padding: '10px 16px', borderRadius: 12, background: '#f3f3f3', border: '1px solid #e1e1e1', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                        >
                            Skip
                        </button>
                        <button
                            onClick={isLast ? finish : () => setStep(s => s + 1)}
                            style={{
                                flex: 1, padding: '10px 16px', borderRadius: 12,
                                background: '#e60023',
                                border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            }}
                        >
                            {isLast ? <><Check size={16} /> Get Started</> : <>Next <ArrowRight size={16} /></>}
                        </button>
                    </div>
                </div>
            </motion.div>
        </>
    );
}
