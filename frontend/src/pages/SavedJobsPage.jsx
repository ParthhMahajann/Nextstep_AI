/**
 * Saved jobs page — Pinterest light theme
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bookmark, CheckCircle, ExternalLink,
    Building2, MapPin, Trash2, Briefcase, Zap,
    ChevronDown, ChevronUp, Calendar, FileText, Save,
    Sparkles, Copy, Check, RefreshCw
} from 'lucide-react';
import { useJobsStore } from '../store/jobsStore';
import { savedJobsAPI, aiAPI } from '../api/client';
import { useToast } from '../components/Toast';

const TAB_CONFIG = [
    { key: 'applied', label: 'Applied', icon: CheckCircle, color: '#e60023', bg: 'rgba(230,0,35,0.08)', border: 'rgba(230,0,35,0.25)' },
    { key: 'saved',   label: 'Saved',   icon: Bookmark,    color: '#1877f2', bg: 'rgba(24,119,242,0.08)', border: 'rgba(24,119,242,0.25)' },
];

function CoverLetterTab({ item }) {
    const [letter, setLetter] = useState(item.cover_letter || '');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const toast = useToast();
    const job = item.job || {};

    const generate = async () => {
        setLoading(true);
        try {
            const res = await aiAPI.generateCoverLetter({ job_id: job.id });
            setLetter(res.data.cover_letter);
            await savedJobsAPI.update(item.id, { cover_letter: res.data.cover_letter });
            toast('Cover letter generated!', 'success');
        } catch { toast('Failed to generate', 'error'); }
        finally { setLoading(false); }
    };

    const copy = () => {
        navigator.clipboard.writeText(letter);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {letter ? (
                <>
                    <div style={{ background: '#f9f9f9', borderRadius: 10, padding: 12, border: '1px solid #e1e1e1', maxHeight: 200, overflowY: 'auto' }}>
                        <p style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{letter}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: `1px solid ${copied ? 'rgba(0,168,107,0.3)' : '#e1e1e1'}`, background: copied ? 'rgba(0,168,107,0.08)' : '#f3f3f3', color: copied ? '#00a86b' : 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied!' : 'Copy'}
                        </button>
                        <button onClick={generate} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: '1px solid #e1e1e1', background: '#f3f3f3', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            <RefreshCw size={12} /> Regenerate
                        </button>
                    </div>
                </>
            ) : (
                <button onClick={generate} disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px', borderRadius: 10, border: '1px solid rgba(230,0,35,0.2)', background: 'rgba(230,0,35,0.06)', color: '#e60023', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                    {loading ? <><span className="ai-pulse-dot" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#e60023', animation: 'pulse 1.2s ease-in-out infinite' }} /> Generating…</> : <><Sparkles size={13} /> Generate Cover Letter</>}
                </button>
            )}
        </div>
    );
}

function JobCard({ item, onRemove }) {
    const job = item.job || item;
    const [expanded, setExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState('notes');
    const [notes, setNotes] = useState(item.notes || '');
    const [interviewDate, setInterviewDate] = useState(item.interview_date ? item.interview_date.slice(0, 16) : '');
    const [followUpDate, setFollowUpDate] = useState(item.follow_up_date || '');
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    const saveDetails = async () => {
        setSaving(true);
        try {
            const payload = { notes };
            if (interviewDate) payload.interview_date = interviewDate;
            if (followUpDate) payload.follow_up_date = followUpDate;
            await savedJobsAPI.update(item.id, payload);
            toast('Saved!', 'success');
        } catch {
            toast('Failed to save', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            style={{
                background: '#ffffff',
                border: `1px solid ${expanded ? 'rgba(230,0,35,0.25)' : '#e1e1e1'}`,
                borderRadius: 16,
                overflow: 'hidden',
                transition: 'border-color 0.2s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                minHeight: 64,
            }}
        >
            {/* Main row */}
            <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                        background: 'rgba(230,0,35,0.08)',
                        border: '1px solid rgba(230,0,35,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 800, color: '#e60023',
                    }}>
                        {(job.company || 'C')[0].toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {job.title}
                        </h3>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <Building2 size={11} /> {job.company}
                            {job.location && <><MapPin size={11} style={{ marginLeft: 4 }} /> {job.location}</>}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {job.apply_link && (
                        <a href={job.apply_link} target="_blank" rel="noopener noreferrer"
                            style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(230,0,35,0.06)', border: '1px solid rgba(230,0,35,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e60023', transition: 'all 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(230,0,35,0.12)'}
                            onMouseOut={e => e.currentTarget.style.background = 'rgba(230,0,35,0.06)'}
                        >
                            <ExternalLink size={15} />
                        </a>
                    )}
                    <button onClick={() => setExpanded(v => !v)}
                        style={{ padding: '12px 16px', borderRadius: 10, background: expanded ? 'rgba(230,0,35,0.06)' : '#f3f3f3', border: '1px solid #e1e1e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: expanded ? '#e60023' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}>
                        {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                    <button onClick={() => onRemove(item.id)}
                        style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(248,113,113,0.15)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(248,113,113,0.06)'}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Expandable notes + dates */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid #f0f0f0' }}>
                            {/* Sub-tabs */}
                        <div style={{ display: 'flex', gap: 4, paddingTop: 12 }}>
                                {[
                                    { key: 'notes',  label: 'Notes', icon: FileText },
                                    { key: 'cover',  label: 'Cover Letter', icon: Sparkles },
                                    { key: 'dates',  label: 'Dates', icon: Calendar },
                                ].map(({ key, label, icon: Icon }) => (
                                    <button key={key} onClick={() => setActiveTab(key)} style={{
                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                        padding: '6px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                        fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
                                        background: activeTab === key ? 'rgba(230,0,35,0.08)' : '#f3f3f3',
                                        color: activeTab === key ? '#e60023' : 'var(--text-muted)',
                                        outline: activeTab === key ? '1px solid rgba(230,0,35,0.25)' : '1px solid transparent',
                                    }}>
                                        <Icon size={11} /> {label}
                                    </button>
                                ))}
                            </div>

                            {activeTab === 'notes' && (
                                <div style={{ marginTop: 10 }}>
                                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes about this application…" rows={3} className="input" style={{ resize: 'none', fontSize: 13, lineHeight: 1.6 }} />
                                    <button onClick={saveDetails} disabled={saving} style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'rgba(230,0,35,0.08)', color: '#e60023', outline: '1px solid rgba(230,0,35,0.2)', opacity: saving ? 0.6 : 1, width: '100%' }}>
                                        <Save size={13} /> {saving ? 'Saving…' : 'Save Notes'}
                                    </button>
                                </div>
                            )}

                            {activeTab === 'cover' && <div style={{ marginTop: 10 }}><CoverLetterTab item={item} /></div>}

                            {activeTab === 'dates' && (
                                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <div>
                                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                                            <Calendar size={11} /> Interview Date
                                        </label>
                                        <input type="datetime-local" value={interviewDate} onChange={e => setInterviewDate(e.target.value)} className="input" style={{ fontSize: 13 }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                                            <Calendar size={11} /> Follow-up Date
                                        </label>
                                        <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} className="input" style={{ fontSize: 13 }} />
                                    </div>
                                    <button onClick={saveDetails} disabled={saving} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'rgba(230,0,35,0.08)', color: '#e60023', outline: '1px solid rgba(230,0,35,0.2)', opacity: saving ? 0.6 : 1 }}>
                                        <Save size={13} /> {saving ? 'Saving…' : 'Save Dates'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export function SavedJobsPage() {
    const { savedJobs, appliedJobs, fetchSavedJobs } = useJobsStore();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('applied');

    useEffect(() => { fetchSavedJobs(); }, [fetchSavedJobs]);

    const removeJob = async (id) => {
        try {
            await savedJobsAPI.delete(id);
            await fetchSavedJobs();
            toast('Job removed', 'info');
        } catch {
            toast('Failed to remove job', 'error');
        }
    };

    const lists = { applied: appliedJobs, saved: savedJobs };
    const currentList = lists[activeTab];
    const currentConfig = TAB_CONFIG.find(t => t.key === activeTab);

    return (
        <div className="page" style={{ position: 'relative', zIndex: 1 }}>
            {/* Header */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 50,
                padding: '16px 20px',
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid var(--border)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="logo-mark" style={{ width: 32, height: 32, borderRadius: 10 }}>
                        <Zap size={15} color="#fff" strokeWidth={2.5} />
                    </div>
                    <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                        My Jobs
                    </h1>
                </div>
            </header>

            <main style={{ maxWidth: 560, width: '100%', margin: '0 auto', padding: '20px 16px 32px' }}>
                {/* Tab switcher */}
                <div style={{
                    display: 'flex', gap: 6, padding: 5, borderRadius: 16,
                    background: '#f3f3f3', border: '1px solid #e1e1e1',
                    marginBottom: 20,
                }}>
                    {TAB_CONFIG.map(({ key, label, icon: Icon, color, bg, border }) => {
                        const count = lists[key].length;
                        const active = activeTab === key;
                        return (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                style={{
                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                                    padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                                    fontWeight: 700, fontSize: 14, transition: 'all 0.2s',
                                    background: active ? bg : 'transparent',
                                    color: active ? color : 'var(--text-muted)',
                                    outline: active ? `1px solid ${border}` : '1px solid transparent',
                                }}
                            >
                                <Icon size={15} />
                                {label}
                                <span style={{
                                    padding: '1px 7px', borderRadius: 99, fontSize: 11,
                                    background: active ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.06)',
                                    color: active ? color : 'var(--text-muted)',
                                }}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Job list */}
                {currentList.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ textAlign: 'center', padding: '60px 20px' }}
                    >
                        <div style={{
                            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
                            background: 'rgba(230,0,35,0.06)', border: '1px solid rgba(230,0,35,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {activeTab === 'applied'
                                ? <Briefcase size={30} color="#e60023" />
                                : <Bookmark size={30} color="#e60023" />}
                        </div>
                        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                            {activeTab === 'applied' ? 'No applications yet' : 'No saved jobs'}
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                            {activeTab === 'applied'
                                ? 'Swipe right on jobs to track your applications'
                                : 'Swipe up on jobs to save them for later'}
                        </p>
                    </motion.div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <AnimatePresence>
                            {currentList.map((item, i) => (
                                <JobCard
                                    key={item.id || i}
                                    item={item}
                                    onRemove={removeJob}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </main>
        </div>
    );
}
