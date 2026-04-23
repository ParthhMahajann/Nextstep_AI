/**
 * Interview Prep Modal — AI-generated Q&A pairs grouped by category
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BrainCircuit, ChevronDown, ChevronUp, Sparkles, Building2, Code2, Users } from 'lucide-react';
import { aiAPI } from '../api/client';

const CATEGORY_CONFIG = {
    technical:    { label: 'Technical',    icon: Code2,        color: '#1877f2', bg: 'rgba(24,119,242,0.08)',  border: 'rgba(24,119,242,0.2)'  },
    behavioural:  { label: 'Behavioural',  icon: Users,        color: '#00a86b', bg: 'rgba(0,168,107,0.08)',   border: 'rgba(0,168,107,0.2)'   },
    behavioral:   { label: 'Behavioural',  icon: Users,        color: '#00a86b', bg: 'rgba(0,168,107,0.08)',   border: 'rgba(0,168,107,0.2)'   },
    company:      { label: 'Company',      icon: Building2,    color: '#d97706', bg: 'rgba(217,119,6,0.08)',   border: 'rgba(217,119,6,0.2)'   },
    default:      { label: 'General',      icon: BrainCircuit, color: '#e60023', bg: 'rgba(230,0,35,0.08)',    border: 'rgba(230,0,35,0.2)'    },
};

function QAItem({ qa, index }) {
    const [open, setOpen] = useState(false);
    const cat = CATEGORY_CONFIG[qa.category?.toLowerCase()] || CATEGORY_CONFIG.default;
    const Icon = cat.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            style={{
                borderRadius: 14,
                border: `1px solid ${open ? cat.border : '#e1e1e1'}`,
                background: open ? cat.bg : '#ffffff',
                overflow: 'hidden', transition: 'all 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
        >
            <button
                onClick={() => setOpen(v => !v)}
                style={{
                    width: '100%', textAlign: 'left', padding: '14px 16px',
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                }}
            >
                <span style={{
                    flexShrink: 0, width: 26, height: 26, borderRadius: 8,
                    background: cat.bg, border: `1px solid ${cat.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                }}>
                    <Icon size={13} color={cat.color} />
                </span>
                <p style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.45, margin: 0 }}>
                    {qa.question}
                </p>
                <span style={{ flexShrink: 0, color: 'var(--text-muted)', marginTop: 2 }}>
                    {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ padding: '0 16px 16px 54px' }}>
                            <div style={{ width: '100%', height: 1, background: '#f0f0f0', marginBottom: 12 }} />
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                {qa.answer}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export function InterviewPrepModal({ job, onClose }) {
    const [questions, setQuestions] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeCategory, setActiveCategory] = useState('all');

    const generate = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await aiAPI.interviewPrep({
                job_id: job.id,
                job_title: job.title,
                company: job.company,
                job_description: job.description || '',
            });
            setQuestions(res.data.questions || []);
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to generate questions. Try again.');
        } finally {
            setLoading(false);
        }
    };

    const categories = questions
        ? ['all', ...new Set(questions.map(q => q.category?.toLowerCase()).filter(Boolean))]
        : [];

    const filtered = questions
        ? (activeCategory === 'all' ? questions : questions.filter(q => q.category?.toLowerCase() === activeCategory))
        : [];

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
            />

            {/* Modal */}
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 401,
                    background: '#ffffff',
                    border: '1px solid #e1e1e1',
                    borderBottom: 'none',
                    boxShadow: '0 -4px 32px rgba(0,0,0,0.1)',
                    borderRadius: '24px 24px 0 0',
                    padding: '8px 0 40px',
                    maxHeight: '88vh', display: 'flex', flexDirection: 'column',
                }}
            >
                {/* Handle */}
                <div style={{ width: 36, height: 4, borderRadius: 99, background: '#e1e1e1', margin: '8px auto 4px' }} />

                {/* Header */}
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(230,0,35,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BrainCircuit size={18} color="#e60023" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Interview Prep</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {job.title} · {job.company}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ width: 34, height: 34, borderRadius: 10, background: '#f3f3f3', border: '1px solid #e1e1e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    {!questions && !loading && (
                        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(230,0,35,0.08)', border: '1px solid rgba(230,0,35,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <BrainCircuit size={30} color="#e60023" />
                            </div>
                            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                                Prepare for Your Interview
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                                AI will generate tailored technical, behavioural, and company-specific questions with model answers.
                            </p>
                            {error && (
                                <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', fontSize: 13 }}>
                                    {error}
                                </div>
                            )}
                            <button onClick={generate} className="btn btn-primary" style={{ width: '100%', gap: 8 }}>
                                <Sparkles size={15} /> Generate Questions
                            </button>
                        </div>
                    )}

                    {loading && (
                        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                            <div className="ai-pulse" style={{ justifyContent: 'center', gap: 6, marginBottom: 16 }}>
                                <div className="ai-pulse-dot" />
                                <div className="ai-pulse-dot" />
                                <div className="ai-pulse-dot" />
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Generating interview questions…</p>
                        </div>
                    )}

                    {questions && (
                        <>
                            {/* Category tabs */}
                            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 16, scrollbarWidth: 'none' }}>
                                {categories.map(cat => {
                                    const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.default;
                                    const active = activeCategory === cat;
                                    return (
                                        <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                                            flexShrink: 0, padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700,
                                            cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                                            background: active ? cfg.bg : '#f3f3f3',
                                            color: active ? cfg.color : 'var(--text-muted)',
                                            outline: active ? `1px solid ${cfg.border}` : '1px solid #e1e1e1',
                                        }}>
                                            {cat === 'all' ? `All (${questions.length})` : (CATEGORY_CONFIG[cat]?.label || cat)}
                                        </button>
                                    );
                                })}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {filtered.map((qa, i) => (
                                    <QAItem key={i} qa={qa} index={i} />
                                ))}
                            </div>

                            <button
                                onClick={generate}
                                style={{ width: '100%', marginTop: 16, padding: '11px', borderRadius: 12, border: '1px solid rgba(230,0,35,0.2)', background: 'rgba(230,0,35,0.06)', color: '#e60023', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                            >
                                <Sparkles size={14} /> Regenerate
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </>
    );
}
