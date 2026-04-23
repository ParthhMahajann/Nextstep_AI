/**
 * Apply modal — 3 tabs: Email · Cover Letter · Tips
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Sparkles, Copy, ExternalLink, Check, Briefcase,
    Mail, FileText, Lightbulb, RefreshCw
} from 'lucide-react';
import { aiAPI, savedJobsAPI } from '../api/client';
import { useToast } from './Toast';

const TABS = [
    { key: 'email',  label: 'Cold Email',    icon: Mail     },
    { key: 'cover',  label: 'Cover Letter',  icon: FileText },
    { key: 'tips',   label: 'App Tips',      icon: Lightbulb },
];

function CopyButton({ text, label = 'Copy' }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button onClick={copy} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 16px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13,
            background: copied ? 'rgba(0,168,107,0.08)' : '#f3f3f3',
            border: `1px solid ${copied ? 'rgba(0,168,107,0.25)' : '#e1e1e1'}`,
            color: copied ? '#00a86b' : 'var(--text-secondary)',
            transition: 'all 0.2s',
        }}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : label}
        </button>
    );
}

function AIPulse() {
    return (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div className="ai-pulse" style={{ justifyContent: 'center', marginBottom: 16 }}>
                <div className="ai-pulse-dot" />
                <div className="ai-pulse-dot" />
                <div className="ai-pulse-dot" />
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Generating with AI…</p>
        </div>
    );
}

// ─── Email Tab ────────────────────────────────────────────────────────────────
function EmailTab({ job, savedJobId }) {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState(null);
    const [tone, setTone] = useState('professional');
    const [error, setError] = useState(null);
    const toast = useToast();

    const generate = async () => {
        setLoading(true); setError(null);
        try {
            const res = await aiAPI.generateEmail({ job_id: job.id, tone });
            setEmail(res.data);
            if (savedJobId) {
                await savedJobsAPI.update(savedJobId, { email_draft: `Subject: ${res.data.subject}\n\n${res.data.body}` });
            }
        } catch (e) {
            setError(e.response?.data?.error || 'Generation failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <AIPulse />;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!email ? (
                <>
                    <div>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Tone</p>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {['professional', 'casual', 'enthusiastic'].map(t => (
                                <button key={t} onClick={() => setTone(t)} style={{
                                    padding: '6px 12px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                    background: tone === t ? 'rgba(230,0,35,0.08)' : '#f3f3f3',
                                    color: tone === t ? '#e60023' : 'var(--text-muted)',
                                    outline: tone === t ? '1px solid rgba(230,0,35,0.25)' : '1px solid #e1e1e1',
                                }}>
                                    {t[0].toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    {error && (
                        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', fontSize: 13 }}>{error}</div>
                    )}
                    <button onClick={generate} className="btn btn-primary" style={{ width: '100%', gap: 8 }}>
                        <Sparkles size={15} /> Generate Email
                    </button>
                </>
            ) : (
                <>
                    <div style={{ background: '#f9f9f9', borderRadius: 12, padding: 14, border: '1px solid #e1e1e1' }}>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Subject</p>
                        <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{email.subject}</p>
                    </div>
                    <div style={{ background: '#f9f9f9', borderRadius: 12, padding: 14, border: '1px solid #e1e1e1' }}>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Body</p>
                        <p style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{email.body}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <CopyButton text={`Subject: ${email.subject}\n\n${email.body}`} />
                        <button onClick={() => setEmail(null)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 12px', borderRadius: 10, border: '1px solid #e1e1e1', background: '#f3f3f3', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            <RefreshCw size={13} /> Retry
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Cover Letter Tab ─────────────────────────────────────────────────────────
function CoverLetterTab({ job, savedJobId }) {
    const [loading, setLoading] = useState(false);
    const [letter, setLetter] = useState(null);
    const [error, setError] = useState(null);

    const generate = async () => {
        setLoading(true); setError(null);
        try {
            const res = await aiAPI.generateCoverLetter({ job_id: job.id });
            setLetter(res.data.cover_letter);
            if (savedJobId) {
                await savedJobsAPI.update(savedJobId, { cover_letter: res.data.cover_letter });
            }
        } catch (e) {
            setError(e.response?.data?.error || 'Generation failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <AIPulse />;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!letter ? (
                <>
                    <div style={{ padding: '20px', borderRadius: 14, background: 'rgba(230,0,35,0.04)', border: '1px solid rgba(230,0,35,0.12)', textAlign: 'center' }}>
                        <FileText size={28} color="#e60023" style={{ margin: '0 auto 10px' }} />
                        <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>AI Cover Letter</p>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            Generate a tailored cover letter for {job.company} based on your profile.
                        </p>
                    </div>
                    {error && (
                        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', fontSize: 13 }}>{error}</div>
                    )}
                    <button onClick={generate} className="btn btn-primary" style={{ width: '100%', gap: 8 }}>
                        <Sparkles size={15} /> Generate Cover Letter
                    </button>
                </>
            ) : (
                <>
                    <div style={{ background: '#f9f9f9', borderRadius: 12, padding: 16, border: '1px solid #e1e1e1', maxHeight: 280, overflowY: 'auto' }}>
                        <p style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{letter}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <CopyButton text={letter} />
                        <button onClick={() => setLetter(null)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 12px', borderRadius: 10, border: '1px solid #e1e1e1', background: '#f3f3f3', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            <RefreshCw size={13} /> Retry
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Tips Tab ─────────────────────────────────────────────────────────────────
function TipsTab({ job }) {
    const [loading, setLoading] = useState(false);
    const [tips, setTips] = useState(null);
    const [error, setError] = useState(null);

    const generate = async () => {
        setLoading(true); setError(null);
        try {
            const res = await aiAPI.getApplicationTips({ job_id: job.id });
            setTips(res.data.tips);
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to get tips. Try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <AIPulse />;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!tips ? (
                <>
                    <div style={{ padding: '20px', borderRadius: 14, background: 'rgba(217,119,6,0.04)', border: '1px solid rgba(217,119,6,0.12)', textAlign: 'center' }}>
                        <Lightbulb size={28} color="#d97706" style={{ margin: '0 auto 10px' }} />
                        <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Application Strategy</p>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            Get AI-crafted tips specific to this role at {job.company}.
                        </p>
                    </div>
                    {error && (
                        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', fontSize: 13 }}>{error}</div>
                    )}
                    <button onClick={generate} className="btn btn-primary" style={{ width: '100%', gap: 8 }}>
                        <Sparkles size={15} /> Get Tips
                    </button>
                </>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(Array.isArray(tips) ? tips : tips.split('\n').filter(Boolean)).map((tip, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}
                            style={{ display: 'flex', gap: 10, padding: '11px 13px', borderRadius: 11, background: 'rgba(217,119,6,0.04)', border: '1px solid rgba(217,119,6,0.12)' }}>
                            <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, background: 'rgba(217,119,6,0.1)', color: '#d97706', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {i + 1}
                            </span>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{tip.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, '')}</p>
                        </motion.div>
                    ))}
                    <button onClick={() => setTips(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '9px 12px', borderRadius: 10, border: '1px solid #e1e1e1', background: '#f3f3f3', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        <RefreshCw size={13} /> Regenerate
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export function ApplyModal({ job, savedJobId, onClose, onApply }) {
    const [activeTab, setActiveTab] = useState('email');

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 350 }}
            onClick={onClose}
        >
            <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                style={{ background: '#ffffff', border: '1px solid #e1e1e1', borderBottom: 'none', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 520, maxHeight: '88vh', overflow: 'auto', boxShadow: '0 -4px 32px rgba(0,0,0,0.12)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Handle */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
                    <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e1e1e1' }} />
                </div>

                {/* Red accent line */}
                <div style={{ height: 2, background: '#e60023', margin: '10px 24px 0', borderRadius: 1 }} />

                {/* Header */}
                <div style={{ padding: '16px 24px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'rgba(230,0,35,0.08)', border: '1px solid rgba(230,0,35,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#e60023' }}>
                            {(job.company || 'C')[0].toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {job.title}
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Briefcase size={10} /> {job.company}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: '#f3f3f3', border: '1px solid #e1e1e1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, padding: '0 20px 12px' }}>
                    {TABS.map(({ key, label, icon: Icon }) => {
                        const active = activeTab === key;
                        return (
                            <button key={key} onClick={() => setActiveTab(key)} style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                padding: '8px 6px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                                background: active ? 'rgba(230,0,35,0.08)' : '#f3f3f3',
                                color: active ? '#e60023' : 'var(--text-muted)',
                                outline: active ? '1px solid rgba(230,0,35,0.25)' : '1px solid #e1e1e1',
                            }}>
                                <Icon size={13} /> {label}
                            </button>
                        );
                    })}
                </div>

                {/* Body */}
                <div style={{ padding: '0 20px 16px', minHeight: 140 }}>
                    <AnimatePresence mode="wait">
                        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
                            {activeTab === 'email'  && <EmailTab       job={job} savedJobId={savedJobId} />}
                            {activeTab === 'cover'  && <CoverLetterTab job={job} savedJobId={savedJobId} />}
                            {activeTab === 'tips'   && <TipsTab        job={job} />}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div style={{ padding: '14px 20px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 10 }}>
                    {job.apply_link ? (
                        <a href={job.apply_link} target="_blank" rel="noopener noreferrer" onClick={onApply}
                            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 20px', borderRadius: 14, textDecoration: 'none', fontWeight: 700, fontSize: 15, background: '#e60023', color: '#fff', boxShadow: '0 4px 16px rgba(230,0,35,0.3)' }}>
                            <ExternalLink size={16} /> Apply Now
                        </a>
                    ) : (
                        <button onClick={onApply} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 20px', borderRadius: 14, border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer', background: '#e60023', color: '#fff', boxShadow: '0 4px 16px rgba(230,0,35,0.3)' }}>
                            <Check size={16} /> Mark as Applied
                        </button>
                    )}
                    <button onClick={onClose} style={{ padding: '13px 16px', borderRadius: 14, border: '1px solid #e1e1e1', background: '#f3f3f3', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                        Later
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
