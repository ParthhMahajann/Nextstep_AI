/**
 * Analytics Dashboard — pipeline funnel, rates, top skills
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart3, TrendingUp, Target, Zap,
    Send, MessageSquare, CheckCircle2, XCircle, Calendar, Building2, MapPin
} from 'lucide-react';
import { savedJobsAPI } from '../api/client';

const STATUS_COLOR = {
    saved:        { color: '#1877f2', bg: 'rgba(24,119,242,0.10)'  },
    preparing:    { color: '#d97706', bg: 'rgba(217,119,6,0.10)'   },
    applied:      { color: '#e60023', bg: 'rgba(230,0,35,0.10)'    },
    interviewing: { color: '#00a86b', bg: 'rgba(0,168,107,0.10)'   },
    rejected:     { color: '#9ca3af', bg: 'rgba(156,163,175,0.10)' },
    accepted:     { color: '#00a86b', bg: 'rgba(0,168,107,0.10)'   },
};

const STATUS_LABELS = {
    saved: 'Saved', preparing: 'Preparing', applied: 'Applied',
    interviewing: 'Interviewing', rejected: 'Rejected', accepted: 'Accepted',
};

function StatCard({ icon: Icon, label, value, sub, color, bg }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                background: bg || '#ffffff',
                border: `1px solid ${color ? color + '33' : '#e1e1e1'}`,
                borderRadius: 18, padding: '18px 20px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: bg || '#f3f3f3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={17} color={color || '#e60023'} />
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
            </div>
            <p style={{ fontSize: 36, fontWeight: 900, color: color || 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</p>
            {sub && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</p>}
        </motion.div>
    );
}

function FunnelBar({ label, count, max, color, bg }) {
    const pct = max > 0 ? Math.round((count / max) * 100) : 0;
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color }}>{count}</span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: '#f0f0f0', overflow: 'hidden' }}>
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{ height: '100%', borderRadius: 99, background: color }}
                />
            </div>
        </div>
    );
}

function UpcomingInterviews({ interviews }) {
    if (!interviews?.length) return null;
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            style={{ background: '#ffffff', border: '1px solid rgba(0,168,107,0.15)', borderRadius: 20, padding: 22, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Calendar size={18} color="#00a86b" />
                <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Upcoming Interviews</h3>
                <span style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: 'rgba(0,168,107,0.15)', color: '#00a86b' }}>{interviews.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {interviews.map(item => {
                    const job = item.job || {};
                    const dt = new Date(item.interview_date);
                    const isToday = dt.toDateString() === new Date().toDateString();
                    const isTomorrow = dt.toDateString() === new Date(Date.now() + 86400000).toDateString();
                    const label = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'rgba(0,168,107,0.06)', border: '1px solid rgba(0,168,107,0.12)' }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(230,0,35,0.08)', border: '1px solid rgba(230,0,35,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#e60023', flexShrink: 0 }}>
                                {(job.company || '?')[0].toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title || 'Interview'}</p>
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                    <Building2 size={10} /> {job.company}
                                </p>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: isToday ? '#f87171' : '#00a86b' }}>{label}</p>
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}

export function AnalyticsPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [upcomingInterviews, setUpcomingInterviews] = useState([]);

    useEffect(() => {
        const load = async () => {
            try {
                const [analyticsRes, jobsRes] = await Promise.all([
                    savedJobsAPI.analytics(),
                    savedJobsAPI.list({ page_size: 200 }),
                ]);
                setData(analyticsRes.data);
                const all = Array.isArray(jobsRes.data) ? jobsRes.data : (jobsRes.data.results || []);
                const now = new Date();
                const upcoming = all
                    .filter(j => j.interview_date && new Date(j.interview_date) > now)
                    .sort((a, b) => new Date(a.interview_date) - new Date(b.interview_date))
                    .slice(0, 5);
                setUpcomingInterviews(upcoming);
            } catch (e) {
                setError(e.response?.data?.error || 'Failed to load analytics');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) {
        return (
            <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                <div className="ai-pulse" style={{ gap: 6 }}>
                    <div className="ai-pulse-dot" /><div className="ai-pulse-dot" /><div className="ai-pulse-dot" />
                </div>
            </div>
        );
    }

    const pipeline = data?.pipeline || {};
    const total = Object.values(pipeline).reduce((s, v) => s + v, 0);
    const maxVal = Math.max(...Object.values(pipeline), 1);

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
                        Analytics
                    </h1>
                </div>
            </header>

            <main style={{ maxWidth: 760, width: '100%', margin: '0 auto', padding: '20px 16px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {error ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#f87171' }}>{error}</div>
                ) : (
                    <>
                        {/* Upcoming interviews */}
                        <UpcomingInterviews interviews={upcomingInterviews} />

                        {/* Stats grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                            <StatCard icon={Send} label="Total Applied" value={total} color="#e60023" bg="rgba(230,0,35,0.06)" />
                            <StatCard icon={TrendingUp} label="Response Rate" value={`${data?.response_rate ?? 0}%`} color="#1877f2" bg="rgba(24,119,242,0.06)" sub="applications with response" />
                            <StatCard icon={Target} label="Offer Rate" value={`${data?.offer_rate ?? 0}%`} color="#00a86b" bg="rgba(0,168,107,0.06)" sub="of applications" />
                            <StatCard icon={MessageSquare} label="Interviewing" value={pipeline.interviewing || 0} color="#d97706" bg="rgba(217,119,6,0.06)" />
                        </div>

                        {/* Pipeline funnel */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            style={{ background: '#ffffff', border: '1px solid #e1e1e1', borderRadius: 20, padding: 22, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                                <BarChart3 size={18} color="#e60023" />
                                <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Application Pipeline</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {Object.entries(pipeline).map(([status, count]) => {
                                    const cfg = STATUS_COLOR[status] || { color: '#767676', bg: 'rgba(0,0,0,0.06)' };
                                    return (
                                        <FunnelBar
                                            key={status}
                                            label={STATUS_LABELS[status] || status}
                                            count={count}
                                            max={maxVal}
                                            color={cfg.color}
                                            bg={cfg.bg}
                                        />
                                    );
                                })}
                                {Object.keys(pipeline).length === 0 && (
                                    <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
                                        No applications tracked yet. Swipe to start!
                                    </p>
                                )}
                            </div>
                        </motion.div>

                        {/* Top skills in pipeline */}
                        {data?.top_skills_in_pipeline?.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                                style={{ background: '#ffffff', border: '1px solid #e1e1e1', borderRadius: 20, padding: 22, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                    <CheckCircle2 size={18} color="#4ade80" />
                                    <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Top Skills in Your Pipeline</h3>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {data.top_skills_in_pipeline.map((item, i) => {
                                        const skill = item.skill ?? item[0];
                                        const count = item.count ?? item[1];
                                        return (
                                            <motion.span
                                                key={skill}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.05 * i }}
                                                style={{
                                                    padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                                                    background: 'rgba(230,0,35,0.06)', color: '#e60023',
                                                    border: '1px solid rgba(230,0,35,0.12)',
                                                    display: 'flex', alignItems: 'center', gap: 6,
                                                }}
                                            >
                                                {skill}
                                                <span style={{ fontSize: 11, opacity: 0.7 }}>×{count}</span>
                                            </motion.span>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {/* Acceptance breakdown */}
                        {(pipeline.accepted > 0 || pipeline.rejected > 0) && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
                            >
                                <div style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 16, padding: '18px 20px', textAlign: 'center' }}>
                                    <CheckCircle2 size={24} color="#4ade80" style={{ margin: '0 auto 8px' }} />
                                    <p style={{ fontSize: 32, fontWeight: 900, color: '#4ade80' }}>{pipeline.accepted || 0}</p>
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Accepted</p>
                                </div>
                                <div style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.12)', borderRadius: 16, padding: '18px 20px', textAlign: 'center' }}>
                                    <XCircle size={24} color="#f87171" style={{ margin: '0 auto 8px' }} />
                                    <p style={{ fontSize: 32, fontWeight: 900, color: '#f87171' }}>{pipeline.rejected || 0}</p>
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Rejected</p>
                                </div>
                            </motion.div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
