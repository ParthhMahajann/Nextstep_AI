/**
 * Kanban Application Tracker — drag cards between pipeline stages
 */

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutGrid, Bookmark, ClipboardList, Send, MessageSquare,
    XCircle, CheckCircle2, Building2, MapPin, ExternalLink, Zap,
    Download, Square, CheckSquare, X
} from 'lucide-react';
import { savedJobsAPI } from '../api/client';
import { useToast } from '../components/Toast';
import { useIsMobile } from '../hooks/useIsMobile';

const COLUMNS = [
    { key: 'saved',        label: 'Saved',        icon: Bookmark,       color: '#1877f2', bg: 'rgba(24,119,242,0.06)',  border: 'rgba(24,119,242,0.18)' },
    { key: 'preparing',   label: 'Preparing',    icon: ClipboardList,  color: '#d97706', bg: 'rgba(217,119,6,0.06)',   border: 'rgba(217,119,6,0.18)'  },
    { key: 'applied',     label: 'Applied',      icon: Send,           color: '#e60023', bg: 'rgba(230,0,35,0.06)',    border: 'rgba(230,0,35,0.18)'   },
    { key: 'interviewing',label: 'Interviewing', icon: MessageSquare,  color: '#7c3aed', bg: 'rgba(124,58,237,0.06)',  border: 'rgba(124,58,237,0.18)' },
    { key: 'rejected',    label: 'Rejected',     icon: XCircle,        color: '#9ca3af', bg: 'rgba(156,163,175,0.06)', border: 'rgba(156,163,175,0.18)' },
    { key: 'accepted',    label: 'Accepted',     icon: CheckCircle2,   color: '#00a86b', bg: 'rgba(0,168,107,0.06)',   border: 'rgba(0,168,107,0.18)'  },
];

function exportCSV(items) {
    const cols = ['ID', 'Title', 'Company', 'Location', 'Status', 'Job Type', 'Source', 'Notes', 'Interview Date', 'Follow-up Date'];
    const rows = items.map(i => {
        const j = i.job || {};
        return [
            i.id, j.title || '', j.company || '', j.location || '',
            i.status, j.job_type || '', j.source || '',
            (i.notes || '').replace(/\n/g, ' '),
            i.interview_date || '',
            i.follow_up_date || '',
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [cols.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'nextstep_applications.csv'; a.click();
    URL.revokeObjectURL(url);
}

function KanbanCard({ item, onMove, selected, onSelect }) {
    const job = item.job || {};
    const [showMenu, setShowMenu] = useState(false);
    const otherCols = COLUMNS.filter(c => c.key !== item.status);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            style={{
                background: selected ? 'rgba(230,0,35,0.04)' : '#ffffff',
                border: selected ? '1px solid rgba(230,0,35,0.3)' : '1px solid #e1e1e1',
                borderRadius: 14, padding: 14,
                cursor: 'pointer', position: 'relative',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
            onClick={() => setShowMenu(v => !v)}
        >
            {/* Select checkbox */}
            <button
                onClick={e => { e.stopPropagation(); onSelect(item.id); }}
                style={{ position: 'absolute', top: 8, right: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, color: selected ? '#e60023' : '#c4c4c4' }}
            >
                {selected ? <CheckSquare size={14} /> : <Square size={14} />}
            </button>
            {/* Company avatar + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: 'rgba(230,0,35,0.08)',
                    border: '1px solid rgba(230,0,35,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, color: '#e60023',
                }}>
                    {(job.company || '?')[0].toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {job.title || 'Unknown Role'}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
                        <Building2 size={10} /> {job.company}
                    </p>
                </div>
            </div>

            {job.location && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={10} /> {job.location}
                </p>
            )}

            {job.apply_link && (
                <a
                    href={job.apply_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11, color: '#e60023', fontWeight: 600, textDecoration: 'none' }}
                >
                    <ExternalLink size={11} /> Open Job
                </a>
            )}

            {/* Move menu */}
            <AnimatePresence>
                {showMenu && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={e => e.stopPropagation()}
                        style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: 4,
                            background: '#ffffff',
                            border: '1px solid #e1e1e1', borderRadius: 12,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                            padding: 8, display: 'flex', flexDirection: 'column', gap: 2,
                        }}
                    >
                        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px' }}>
                            Move to
                        </p>
                        {otherCols.map(col => (
                            <button
                                key={col.key}
                                onClick={() => { onMove(item.id, col.key); setShowMenu(false); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '8px 10px', borderRadius: 8, border: 'none',
                                    background: 'transparent', color: col.color, cursor: 'pointer',
                                    fontSize: 13, fontWeight: 600, transition: 'background 0.15s',
                                }}
                                onMouseOver={e => e.currentTarget.style.background = col.bg}
                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <col.icon size={13} />
                                {col.label}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export function KanbanPage() {
    const isMobile = useIsMobile();
    const scrollRef = useRef(null);
    const [activeColIndex, setActiveColIndex] = useState(0);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(new Set());
    const toast = useToast();

    const toggleSelect = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const clearSelect = () => setSelected(new Set());

    const handleExport = () => {
        const toExport = selected.size > 0 ? items.filter(i => selected.has(i.id)) : items;
        exportCSV(toExport);
    };

    const load = async () => {
        try {
            const res = await savedJobsAPI.list({ page_size: 200 });
            const all = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setItems(all);
        } catch {
            toast('Failed to load applications', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    useEffect(() => {
        if (!isMobile) {
            setActiveColIndex(0);
            return;
        }
        const el = scrollRef.current;
        if (!el) return;
        const onScroll = () => {
            const COLUMN_STRIDE = 260 + 12; // minWidth + gap
            setActiveColIndex(Math.round(el.scrollLeft / COLUMN_STRIDE));
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, [isMobile]);

    const moveCard = async (id, newStatus) => {
        try {
            await savedJobsAPI.update(id, { status: newStatus });
            setItems(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i));
            toast(`Moved to ${COLUMNS.find(c => c.key === newStatus)?.label}`, 'success');
        } catch {
            toast('Failed to update status', 'error');
        }
    };

    if (loading) {
        return (
            <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                <div className="ai-pulse" style={{ gap: 6 }}>
                    <div className="ai-pulse-dot" /><div className="ai-pulse-dot" /><div className="ai-pulse-dot" />
                </div>
            </div>
        );
    }

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
                <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="logo-mark" style={{ width: 32, height: 32, borderRadius: 10 }}>
                        <Zap size={15} color="#fff" strokeWidth={2.5} />
                    </div>
                    <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                        Application Tracker
                    </h1>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {selected.size > 0 && (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 12, color: '#e60023', fontWeight: 600 }}>{selected.size} selected</span>
                                <button onClick={clearSelect} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={14} /></button>
                            </motion.div>
                        )}
                        <button
                            onClick={handleExport}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: '#f3f3f3', border: '1px solid #e1e1e1', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                            <Download size={13} /> Export CSV
                        </button>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {items.length} app{items.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
            </header>

            {/* Kanban board — horizontal scroll */}
            <div
                ref={isMobile ? scrollRef : undefined}
                className={isMobile ? 'kanban-mobile-scroll' : undefined}
                style={isMobile ? {
                    display: 'flex',
                    gap: 12,
                    overflowX: 'auto',
                    scrollSnapType: 'x mandatory',
                    WebkitOverflowScrolling: 'touch',
                    paddingTop: 16,
                    paddingBottom: 8,
                    paddingLeft: 16,
                    paddingRight: 16,
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                } : {
                    display: 'flex', gap: 14, overflowX: 'auto', padding: '20px 20px 24px',
                    scrollbarWidth: 'thin', scrollbarColor: '#d4d4d4 transparent',
                    minHeight: 'calc(100vh - 65px)',
                    alignItems: 'flex-start',
                }}
            >
                {COLUMNS.map(col => {
                    const colItems = items.filter(i => i.status === col.key);
                    const Icon = col.icon;
                    return (
                        <div key={col.key} style={{
                            flexShrink: 0,
                            width: isMobile ? undefined : 260,
                            minWidth: isMobile ? 260 : undefined,
                            scrollSnapAlign: isMobile ? 'start' : undefined,
                            display: 'flex', flexDirection: 'column', gap: 10,
                        }}>
                            {/* Column header */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '10px 12px', borderRadius: 12,
                                background: col.bg, border: `1px solid ${col.border}`,
                            }}>
                                <Icon size={15} color={col.color} />
                                <span style={{ fontWeight: 700, fontSize: 13, color: col.color }}>{col.label}</span>
                                <span style={{
                                    marginLeft: 'auto', minWidth: 20, height: 20, borderRadius: 6, paddingInline: 6,
                                    background: 'rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 11, fontWeight: 700, color: col.color,
                                }}>
                                    {colItems.length}
                                </span>
                            </div>

                            {/* Cards */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 60 }}>
                                <AnimatePresence>
                                    {colItems.map(item => (
                                        <KanbanCard key={item.id} item={item} onMove={moveCard} selected={selected.has(item.id)} onSelect={toggleSelect} />
                                    ))}
                                </AnimatePresence>

                                {colItems.length === 0 && (
                                    <div style={{
                                        borderRadius: 12, padding: '20px 12px', textAlign: 'center',
                                        border: '1.5px dashed #e1e1e1',
                                        color: 'var(--text-muted)', fontSize: 12,
                                    }}>
                                        Drop cards here
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {isMobile && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, paddingTop: 12 }}>
                    {COLUMNS.map((col, i) => (
                        <div
                            key={col.key}
                            style={{
                                width: i === activeColIndex ? 20 : 6,
                                height: 6,
                                borderRadius: 99,
                                background: i === activeColIndex ? col.color : '#e1e1e1',
                                transition: 'all 0.25s ease',
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
