/**
 * Discover page — Pinterest light theme
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, RefreshCw, SlidersHorizontal, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CardStack, SwipeActions } from '../components/SwipeCard';
import { useJobsStore } from '../store/jobsStore';
import { ApplyModal } from '../components/ApplyModal';
import { FilterDrawer } from '../components/FilterDrawer';
import { JobDetailSheet } from '../components/JobDetailSheet';
import { useToast } from '../components/Toast';

export function DiscoverPage() {
    const { jobs, currentIndex, fetchRecommended, skipJob, saveJob, applyToJob, isLoading, error, filters, setFilters } = useJobsStore();
    const toast = useToast();
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [localFilters, setLocalFilters] = useState(filters);
    const [showDetail, setShowDetail] = useState(false);
    const [detailJob, setDetailJob] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const searchRef = useRef(null);

    useEffect(() => { fetchRecommended(); }, [fetchRecommended]);

    useEffect(() => {
        if (showSearch) searchRef.current?.focus();
    }, [showSearch]);

    const activeFilterCount = Object.values(localFilters).filter(v => v && v !== '' && v !== false).length;

    const currentJob = jobs[currentIndex];
    const remaining = jobs.length - currentIndex;

    // Client-side search filter on top of the server results
    const filteredJobs = searchQuery.trim()
        ? jobs.filter(j => {
            const q = searchQuery.toLowerCase();
            return (j.title || '').toLowerCase().includes(q)
                || (j.company || '').toLowerCase().includes(q)
                || (j.location || '').toLowerCase().includes(q);
        })
        : jobs;

    const displayIndex = searchQuery.trim() ? 0 : currentIndex;
    const displayJob = filteredJobs[displayIndex] || null;

    const handleSwipe = (action) => {
        if (!displayJob) return;
        if (action === 'skip') {
            if (searchQuery.trim()) return; // don't advance if searching
            skipJob();
        } else if (action === 'save') {
            saveJob(displayJob);
            toast('Job saved!', 'info');
        } else if (action === 'apply') {
            setSelectedJob(displayJob);
            setShowApplyModal(true);
        }
    };

    const handleApply = async () => {
        if (selectedJob) {
            await applyToJob(selectedJob);
            setShowApplyModal(false);
            setSelectedJob(null);
            toast('Application tracked!', 'success');
        }
    };

    const openDetail = (job) => {
        setDetailJob(job);
        setShowDetail(true);
    };

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
                <div>
                    <AnimatePresence mode="wait">
                        {showSearch ? (
                            <motion.div
                                key="search"
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                            >
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', background: '#f3f3f3', border: '1px solid #e1e1e1', borderRadius: 14 }}>
                                    <Search size={15} color="var(--text-muted)" />
                                    <input
                                        ref={searchRef}
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Search title, company, location…"
                                        style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 14, padding: '10px 0' }}
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                                <button onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                                    style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #e1e1e1', background: '#f3f3f3', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                    Cancel
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="title"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                                <Link to="/discover" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                                    <div className="logo-mark" style={{ width: 36, height: 36, borderRadius: 11 }}>
                                        <Zap size={18} color="#fff" strokeWidth={2.5} />
                                    </div>
                                    <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                                        NextStep<span className="text-gradient">AI</span>
                                    </span>
                                </Link>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {!isLoading && jobs.length > 0 && remaining > 0 && !searchQuery && (
                                        <div style={{ padding: '4px 12px', borderRadius: 999, background: 'rgba(230,0,35,0.08)', border: '1px solid rgba(230,0,35,0.2)', color: '#e60023', fontSize: 12, fontWeight: 700 }}>
                                            {remaining} left
                                        </div>
                                    )}
                                    <button onClick={() => setShowSearch(true)}
                                        style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                        <Search size={15} />
                                    </button>
                                    <button
                                        onClick={() => { setLocalFilters(filters); setShowFilters(true); }}
                                        style={{ width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: activeFilterCount > 0 ? 'rgba(230,0,35,0.08)' : 'var(--bg-elevated)', border: activeFilterCount > 0 ? '1px solid rgba(230,0,35,0.25)' : '1px solid var(--border)', color: activeFilterCount > 0 ? '#e60023' : 'var(--text-muted)' }}
                                    >
                                        <SlidersHorizontal size={15} />
                                        {activeFilterCount > 0 && (
                                            <span style={{ position: 'absolute', top: -3, right: -3, width: 16, height: 16, borderRadius: '50%', background: '#e60023', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff' }}>
                                                {activeFilterCount}
                                            </span>
                                        )}
                                    </button>
                                    <button onClick={fetchRecommended}
                                        style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                        <RefreshCw size={15} />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            {/* Main */}
            <main style={{ maxWidth: 480, width: '100%', margin: '0 auto', padding: '20px 16px 24px' }}>
                {error && !isLoading && (
                    <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 14, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 13, color: '#dc2626', flex: 1 }}>
                            {typeof error === 'string' ? error : 'Could not load jobs — check your connection or backend.'}
                        </span>
                        <button onClick={fetchRecommended} style={{ fontSize: 12, fontWeight: 700, color: '#e60023', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            Retry
                        </button>
                    </div>
                )}
                {isLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 500, gap: 24 }}>
                        <div style={{ position: 'relative' }}>
                            {[0.88, 0.94, 1].map((scale, i) => (
                                <div key={i} style={{ position: i < 2 ? 'absolute' : 'relative', top: i < 2 ? `${(2 - i) * 10}px` : 0, left: 0, right: 0, transform: `scale(${scale})`, transformOrigin: 'bottom center', width: '100%', height: 480, borderRadius: 24, background: '#ffffff', border: '1px solid #e1e1e1', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', zIndex: i + 1 }}>
                                    {i === 2 && (
                                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                            <div className="skeleton" style={{ height: 20, width: '60%' }} />
                                            <div className="skeleton" style={{ height: 15, width: '40%' }} />
                                            <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
                                            <div className="skeleton" style={{ height: 13, width: '100%' }} />
                                            <div className="skeleton" style={{ height: 13, width: '90%' }} />
                                            <div className="skeleton" style={{ height: 13, width: '80%' }} />
                                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                                {[80, 100, 70].map((w, j) => <div key={j} className="skeleton" style={{ height: 26, width: w, borderRadius: 99 }} />)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="ai-pulse">
                            <div className="ai-pulse-dot" /><div className="ai-pulse-dot" /><div className="ai-pulse-dot" />
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Finding your best matches…</p>
                    </div>
                ) : searchQuery.trim() ? (
                    /* Search results list */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                            {filteredJobs.length} result{filteredJobs.length !== 1 ? 's' : ''} for "<span style={{ color: 'var(--text-primary)' }}>{searchQuery}</span>"
                        </p>
                        {filteredJobs.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
                                No jobs match your search. Try a different term.
                            </div>
                        )}
                        {filteredJobs.map(job => (
                            <motion.div key={job.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                onClick={() => openDetail(job)}
                                style={{ background: '#ffffff', border: '1px solid #e1e1e1', borderRadius: 16, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'border-color 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                                onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(230,0,35,0.3)'}
                                onMouseOut={e => e.currentTarget.style.borderColor = '#e1e1e1'}
                            >
                                <div style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, background: 'rgba(230,0,35,0.08)', border: '1px solid rgba(230,0,35,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#e60023' }}>
                                    {(job.company || '?')[0].toUpperCase()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</p>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{job.company}{job.location ? ` · ${job.location}` : ''}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        <CardStack jobs={jobs} currentIndex={currentIndex} onSwipe={handleSwipe} onCardTap={openDetail} onRefresh={fetchRecommended} />

                        <div style={{ marginTop: 24 }}>
                            <SwipeActions
                                onSkip={() => handleSwipe('skip')}
                                onSave={() => handleSwipe('save')}
                                onApply={() => handleSwipe('apply')}
                                disabled={!currentJob}
                            />
                        </div>

                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                            style={{ marginTop: 16, textAlign: 'center' }}
                        >
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 20, fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                                <span>← skip</span>
                                <span style={{ color: '#e60023', fontWeight: 600 }}>↑ save</span>
                                <span style={{ color: '#e60023', fontWeight: 600 }}>→ apply · tap for details</span>
                            </div>
                        </motion.div>
                    </div>
                )}
            </main>

            {/* Apply Modal */}
            <AnimatePresence>
                {showApplyModal && selectedJob && (
                    <ApplyModal
                        job={selectedJob}
                        onClose={() => setShowApplyModal(false)}
                        onApply={handleApply}
                    />
                )}
            </AnimatePresence>

            {/* Job Detail Sheet */}
            <AnimatePresence>
                {showDetail && detailJob && (
                    <JobDetailSheet
                        job={detailJob}
                        onClose={() => setShowDetail(false)}
                        onSave={() => { saveJob(detailJob); setShowDetail(false); toast('Job saved!', 'info'); }}
                        onApply={() => { setSelectedJob(detailJob); setShowDetail(false); setShowApplyModal(true); }}
                    />
                )}
            </AnimatePresence>

            {/* Filter Drawer */}
            <FilterDrawer
                open={showFilters}
                filters={localFilters}
                onChange={setLocalFilters}
                onClose={() => setShowFilters(false)}
                onApply={() => {
                    setFilters(localFilters);
                    setShowFilters(false);
                    fetchRecommended();
                }}
            />
        </div>
    );
}
