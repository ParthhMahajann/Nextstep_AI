/**
 * Job Detail Sheet — full description + skill gap, opens on card tap
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Building2, MapPin, ExternalLink, Briefcase, Sparkles,
    CheckCircle2, XCircle, ChevronDown, ChevronUp, BrainCircuit, Search, Layers
} from 'lucide-react';
import { jobsAPI, aiAPI } from '../api/client';
import { InterviewPrepModal } from './InterviewPrepModal';
import { useIsMobile } from '../hooks/useIsMobile';

const JOB_TYPE_LABELS = {
    job: 'Job',
    'part-time': 'Part-time',
    contract: 'Contract',
    internship: 'Internship',
    freelance: 'Freelance',
};

function SkillGapSection({ jobId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const load = async () => {
        if (data || loading) return;
        setLoading(true);
        try {
            const res = await jobsAPI.skillGap(jobId);
            setData(res.data);
        } catch { /* silent */ }
        finally { setLoading(false); }
    };

    const toggle = () => {
        if (!open) load();
        setOpen(v => !v);
    };

    return (
        <div style={{ borderRadius: 14, border: '1px solid rgba(230,0,35,0.15)', overflow: 'hidden' }}>
            <button onClick={toggle} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '13px 16px', background: 'rgba(230,0,35,0.04)',
                border: 'none', cursor: 'pointer', textAlign: 'left',
            }}>
                <BrainCircuit size={16} color="#e60023" />
                <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Skill Gap Analysis</span>
                {data && (
                    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: data.match_percentage >= 70 ? 'rgba(0,168,107,0.15)' : 'rgba(251,191,36,0.15)', color: data.match_percentage >= 70 ? '#00a86b' : '#fbbf24' }}>
                        {data.match_percentage}% match
                    </span>
                )}
                {open ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ padding: '12px 16px 16px' }}>
                            {loading && (
                                <div className="ai-pulse" style={{ justifyContent: 'center', padding: '16px 0' }}>
                                    <div className="ai-pulse-dot" /><div className="ai-pulse-dot" /><div className="ai-pulse-dot" />
                                </div>
                            )}
                            {data && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {data.matched_skills?.length > 0 && (
                                        <div>
                                            <p style={{ fontSize: 11, fontWeight: 700, color: '#00a86b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <CheckCircle2 size={12} /> You have ({data.matched_skills.length})
                                            </p>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {data.matched_skills.map(s => (
                                                    <span key={s} style={{ padding: '4px 10px', borderRadius: 99, fontSize: 12, background: 'rgba(0,168,107,0.1)', color: '#00a86b', border: '1px solid rgba(0,168,107,0.2)' }}>{s}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {data.missing_skills?.length > 0 && (
                                        <div>
                                            <p style={{ fontSize: 11, fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <XCircle size={12} /> Missing ({data.missing_skills.length})
                                            </p>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {data.missing_skills.map(s => (
                                                    <span key={s} style={{ padding: '4px 10px', borderRadius: 99, fontSize: 12, background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>{s}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {!data.matched_skills?.length && !data.missing_skills?.length && (
                                        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Add skills to your profile for a gap analysis.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function CompanyResearchSection({ job }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const load = async () => {
        if (data || loading) return;
        setLoading(true);
        try {
            const res = await aiAPI.companyResearch({
                company: job.company,
                job_title: job.title,
                job_description: job.description || '',
            });
            setData(res.data);
        } catch { /* silent */ }
        finally { setLoading(false); }
    };

    const toggle = () => {
        if (!open) load();
        setOpen(v => !v);
    };

    return (
        <div style={{ borderRadius: 14, border: '1px solid rgba(24,119,242,0.15)', overflow: 'hidden' }}>
            <button onClick={toggle} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '13px 16px', background: 'rgba(24,119,242,0.04)',
                border: 'none', cursor: 'pointer', textAlign: 'left',
            }}>
                <Search size={16} color="#1877f2" />
                <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Company Research</span>
                {open ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {loading && (
                                <div className="ai-pulse" style={{ justifyContent: 'center', padding: '16px 0' }}>
                                    <div className="ai-pulse-dot" /><div className="ai-pulse-dot" /><div className="ai-pulse-dot" />
                                </div>
                            )}
                            {data && (
                                <>
                                    {data.overview && (
                                        <div>
                                            <p style={{ fontSize: 11, fontWeight: 700, color: '#1877f2', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Overview</p>
                                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{data.overview}</p>
                                        </div>
                                    )}
                                    {data.culture?.length > 0 && (
                                        <div>
                                            <p style={{ fontSize: 11, fontWeight: 700, color: '#1877f2', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Culture</p>
                                            <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                {data.culture.map((c, i) => <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{c}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                    {data.tech_stack?.length > 0 && (
                                        <div>
                                            <p style={{ fontSize: 11, fontWeight: 700, color: '#1877f2', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Tech Stack</p>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {data.tech_stack.map(t => (
                                                    <span key={t} style={{ padding: '3px 9px', borderRadius: 99, fontSize: 12, background: 'rgba(24,119,242,0.08)', color: '#1877f2', border: '1px solid rgba(24,119,242,0.2)' }}>{t}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {data.interview_format && (
                                        <div>
                                            <p style={{ fontSize: 11, fontWeight: 700, color: '#1877f2', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Interview Format</p>
                                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{data.interview_format}</p>
                                        </div>
                                    )}
                                    {data.tips?.length > 0 && (
                                        <div>
                                            <p style={{ fontSize: 11, fontWeight: 700, color: '#00a86b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Tips</p>
                                            <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                {data.tips.map((t, i) => <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                    {data.red_flags?.length > 0 && (
                                        <div>
                                            <p style={{ fontSize: 11, fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Watch Out</p>
                                            <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                {data.red_flags.map((r, i) => <li key={i} style={{ fontSize: 13, color: '#f87171' }}>{r}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function SimilarJobsSection({ jobId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const load = async () => {
        if (data || loading) return;
        setLoading(true);
        try {
            const res = await jobsAPI.similar(jobId);
            setData(res.data.results || []);
        } catch { /* silent */ }
        finally { setLoading(false); }
    };

    const toggle = () => {
        if (!open) load();
        setOpen(v => !v);
    };

    return (
        <div style={{ borderRadius: 14, border: '1px solid rgba(0,168,107,0.15)', overflow: 'hidden' }}>
            <button onClick={toggle} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '13px 16px', background: 'rgba(0,168,107,0.04)',
                border: 'none', cursor: 'pointer', textAlign: 'left',
            }}>
                <Layers size={16} color="#00a86b" />
                <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Similar Jobs</span>
                {open ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ padding: '12px 16px 16px' }}>
                            {loading && (
                                <div className="ai-pulse" style={{ justifyContent: 'center', padding: '16px 0' }}>
                                    <div className="ai-pulse-dot" /><div className="ai-pulse-dot" /><div className="ai-pulse-dot" />
                                </div>
                            )}
                            {data && data.length === 0 && (
                                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No similar jobs found yet — run precompute_embeddings first.</p>
                            )}
                            {data && data.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {data.map(j => (
                                        <div key={j.id} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(0,168,107,0.05)', border: '1px solid rgba(0,168,107,0.12)' }}>
                                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{j.title}</p>
                                            <p style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <Building2 size={11} /> {j.company}
                                                {j.location && <><MapPin size={11} /> {j.location}</>}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function JobDetailSheet({ job, onClose, onApply, onSave }) {
    const isMobile = useIsMobile();
    const [showInterviewPrep, setShowInterviewPrep] = useState(false);
    const [descExpanded, setDescExpanded] = useState(false);
    const desc = job.description || job.ai_summary || '';
    const shortDesc = desc.slice(0, 400);
    const needsTruncate = desc.length > 400;

    return (
        <>
            {/* Backdrop */}
            {!isMobile && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose}
                    style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
                />
            )}

            {/* Sheet */}
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 310 }}
                style={isMobile ? {
                    position: 'fixed', inset: 0, zIndex: 301,
                    background: '#ffffff',
                    display: 'flex', flexDirection: 'column',
                } : {
                    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301,
                    background: '#ffffff',
                    border: '1px solid #e1e1e1', borderBottom: 'none',
                    borderRadius: '24px 24px 0 0',
                    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                    boxShadow: '0 -4px 32px rgba(0,0,0,0.12)',
                }}
            >
                {/* Handle — desktop only */}
                {!isMobile && (
                    <div style={{ width: 36, height: 4, borderRadius: 99, background: '#e1e1e1', margin: '10px auto 0' }} />
                )}

                {/* Mobile top bar — back button + job title */}
                {isMobile && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 16px',
                        paddingTop: 'max(12px, env(safe-area-inset-top))',
                        borderBottom: '1px solid #f0f0f0',
                        flexShrink: 0,
                    }}>
                        <button
                            onClick={onClose}
                            style={{
                                width: 44, height: 44, borderRadius: 12,
                                background: '#f3f3f3', border: '1px solid #e1e1e1',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0,
                            }}
                        >
                            <X size={18} />
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{job.title}</p>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{job.company}{job.location ? ` · ${job.location}` : ''}</p>
                        </div>
                    </div>
                )}

                {/* Scrollable body */}
                <div className="modal-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 32px' }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                        <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: 'rgba(230,0,35,0.08)', border: '1px solid rgba(230,0,35,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#e60023' }}>
                            {(job.company || '?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>{job.title}</h2>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
                                <Building2 size={12} /> {job.company}
                                {job.location && <><MapPin size={12} style={{ marginLeft: 4 }} /> {job.location}</>}
                            </p>
                        </div>
                        {!isMobile && (
                            <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, background: '#f3f3f3', border: '1px solid #e1e1e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 18 }}>
                        {job.job_type && <span style={{ padding: '4px 11px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: 'rgba(230,0,35,0.08)', color: '#e60023', border: '1px solid rgba(230,0,35,0.15)' }}>{JOB_TYPE_LABELS[job.job_type] || job.job_type}</span>}
                        {job.experience_level && <span style={{ padding: '4px 11px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: 'rgba(24,119,242,0.08)', color: '#1877f2', border: '1px solid rgba(24,119,242,0.15)' }}>{job.experience_level}</span>}
                        {job.role_type && <span style={{ padding: '4px 11px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: 'rgba(0,168,107,0.08)', color: '#00a86b', border: '1px solid rgba(0,168,107,0.15)' }}>{job.role_type}</span>}
                    </div>

                    {/* AI Summary */}
                    {job.ai_summary && (
                        <div style={{ padding: 14, borderRadius: 12, background: 'rgba(230,0,35,0.04)', border: '1px solid rgba(230,0,35,0.12)', marginBottom: 16, display: 'flex', gap: 10 }}>
                            <Sparkles size={15} color="#e60023" style={{ flexShrink: 0, marginTop: 1 }} />
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{job.ai_summary}</p>
                        </div>
                    )}

                    {/* Description */}
                    {desc && (
                        <div style={{ marginBottom: 16 }}>
                            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Description</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                                {descExpanded || !needsTruncate ? desc : shortDesc + '…'}
                            </p>
                            {needsTruncate && (
                                <button onClick={() => setDescExpanded(v => !v)} style={{ marginTop: 8, fontSize: 13, color: '#e60023', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {descExpanded ? <><ChevronUp size={14} /> Show less</> : <><ChevronDown size={14} /> Show more</>}
                                </button>
                            )}
                        </div>
                    )}

                    {/* AI Skills */}
                    {job.ai_skills?.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Required Skills</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {job.ai_skills.map(s => (
                                    <span key={s} style={{ padding: '4px 10px', borderRadius: 99, fontSize: 12, background: '#f3f3f3', color: 'var(--text-secondary)', border: '1px solid #e1e1e1' }}>{s}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Skill Gap */}
                    <div style={{ marginBottom: 12 }}>
                        <SkillGapSection jobId={job.id} />
                    </div>

                    {/* Company Research */}
                    {job.company && (
                        <div style={{ marginBottom: 16 }}>
                            <CompanyResearchSection job={job} />
                        </div>
                    )}

                    {/* Similar Jobs */}
                    <div style={{ marginBottom: 16 }}>
                        <SimilarJobsSection jobId={job.id} />
                    </div>

                    {/* Interview Prep button */}
                    <button
                        onClick={() => setShowInterviewPrep(true)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', borderRadius: 12, border: '1px solid rgba(230,0,35,0.2)', background: 'rgba(230,0,35,0.06)', color: '#e60023', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                    >
                        <BrainCircuit size={15} /> Prep for Interview
                    </button>
                </div>

                {/* Footer CTA */}
                <div style={{
                    padding: '12px 20px',
                    paddingBottom: 'max(36px, calc(12px + env(safe-area-inset-bottom)))',
                    borderTop: '1px solid #f0f0f0',
                    display: 'flex', gap: 10, background: '#ffffff',
                    flexShrink: 0,
                }}>
                    <button onClick={onSave} style={{ flex: 1, padding: '13px', borderRadius: 14, border: '1px solid #e1e1e1', background: '#f3f3f3', color: 'var(--text-secondary)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                        Save
                    </button>
                    <button onClick={onApply} className="btn btn-primary" style={{ flex: 2, padding: '13px', borderRadius: 14 }}>
                        <ExternalLink size={15} /> Apply
                    </button>
                </div>
            </motion.div>

            {/* Interview Prep */}
            <AnimatePresence>
                {showInterviewPrep && (
                    <InterviewPrepModal job={job} onClose={() => setShowInterviewPrep(false)} />
                )}
            </AnimatePresence>
        </>
    );
}
