/**
 * SwipeCard, CardStack, SwipeActions — Pinterest light theme
 */

import { useState } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import {
    MapPin, Building2, Briefcase, ExternalLink,
    X, Bookmark, Check, Zap, Star, RefreshCw
} from 'lucide-react';

/* ────────────────────────────────────────────
   Utility: job-type pill config
   ──────────────────────────────────────────── */
const JOB_TYPE_CONFIG = {
    job:        { label: 'Full-time',  color: '#e60023', bg: 'rgba(230,0,35,0.08)'   },
    internship: { label: 'Internship', color: '#1877f2', bg: 'rgba(24,119,242,0.08)' },
    freelance:  { label: 'Freelance',  color: '#00a86b', bg: 'rgba(0,168,107,0.08)'  },
    'part-time':{ label: 'Part-time',  color: '#d97706', bg: 'rgba(217,119,6,0.08)'  },
    contract:   { label: 'Contract',   color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
};

function MatchRing({ score }) {
    if (!score) return null;
    const pct = Math.round(score * 100);
    const color = pct >= 70 ? '#00a86b' : pct >= 40 ? '#d97706' : '#e60023';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: `conic-gradient(${color} ${pct * 3.6}deg, #e1e1e1 0deg)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
            }}>
                <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, color,
                }}>
                    {pct}%
                </div>
            </div>
        </div>
    );
}

/* ────────────────────────────────────────────
   SwipeCard
   ──────────────────────────────────────────── */
export function SwipeCard({ job, onSwipe, isTop, onTap }) {
    const [exitX, setExitX] = useState(0);
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-220, 0, 220], [-8, 0, 8]);
    const leftOpacity  = useTransform(x, [-140, -30], [1, 0]);
    const rightOpacity = useTransform(x, [30, 140], [0, 1]);
    const upOpacity    = useTransform(x, [-50, 0, 50], [0, 1, 0]);

    const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });

    const handleDragEnd = (_, info) => {
        setDragDelta(info.offset);
        if      (info.offset.x >  110) { setExitX(400); onSwipe('apply'); }
        else if (info.offset.x < -110) { setExitX(-400); onSwipe('skip'); }
        else if (info.offset.y < -80)  { onSwipe('save'); }
    };

    const handleClick = () => {
        // Only trigger detail if user didn't drag significantly
        if (onTap && Math.abs(dragDelta.x) < 10 && Math.abs(dragDelta.y) < 10) {
            onTap();
        }
        setDragDelta({ x: 0, y: 0 });
    };

    const matchScore = job.match_score ? Math.round(job.match_score * 100) : null;
    const typeConfig = JOB_TYPE_CONFIG[job.job_type] || JOB_TYPE_CONFIG.job;
    const skills = job.ai_skills?.slice(0, 6) || job.matched_skills?.slice(0, 6) || [];

    return (
        <motion.div
            style={{
                position: 'absolute',
                width: '100%',
                x,
                rotate: isTop ? rotate : 0,
                zIndex: isTop ? 10 : 1,
                cursor: isTop ? 'grab' : 'default',
            }}
            drag={isTop ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.85}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
            initial={{ scale: isTop ? 1 : 0.94, y: isTop ? 0 : 20 }}
            animate={{ scale: isTop ? 1 : 0.94, y: isTop ? 0 : 20 }}
            exit={{ x: exitX, opacity: 0, rotate: exitX > 0 ? 10 : -10, transition: { duration: 0.28 } }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            whileTap={{ cursor: 'grabbing' }}
        >
            {/* Swipe stamps */}
            {isTop && (
                <>
                    <motion.div style={{
                        opacity: leftOpacity,
                        position: 'absolute', top: 20, left: 16, zIndex: 20,
                        padding: '6px 14px', borderRadius: 8,
                        border: '2.5px solid #767676', color: '#767676',
                        fontWeight: 900, fontSize: 15, letterSpacing: 2,
                        transform: 'rotate(-15deg)',
                        background: 'rgba(0,0,0,0.04)',
                        pointerEvents: 'none',
                    }}>
                        SKIP
                    </motion.div>
                    <motion.div style={{
                        opacity: rightOpacity,
                        position: 'absolute', top: 20, right: 16, zIndex: 20,
                        padding: '6px 14px', borderRadius: 8,
                        border: '2.5px solid #e60023', color: '#e60023',
                        fontWeight: 900, fontSize: 15, letterSpacing: 2,
                        transform: 'rotate(15deg)',
                        background: 'rgba(230,0,35,0.06)',
                        pointerEvents: 'none',
                    }}>
                        APPLY
                    </motion.div>
                </>
            )}

            {/* Card body */}
            <div style={{
                background: '#ffffff',
                border: '1px solid #e1e1e1',
                borderRadius: 24,
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
                userSelect: 'none',
            }}>
                {/* Brand top band */}
                <div style={{
                    height: 5,
                    background: '#e60023',
                }} />

                <div style={{ padding: '20px 22px 22px' }}>
                    {/* Company row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                            {/* Company avatar */}
                            <div style={{
                                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                                background: 'rgba(230,0,35,0.08)',
                                border: '1px solid rgba(230,0,35,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 18, fontWeight: 800, color: '#e60023',
                            }}>
                                {(job.company || 'C')[0].toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <h3 style={{
                                    fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
                                    lineHeight: 1.3, marginBottom: 2,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                    {job.title}
                                </h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Building2 size={12} />
                                    {job.company}
                                </p>
                            </div>
                        </div>
                        {matchScore && <MatchRing score={job.match_score} />}
                    </div>

                    {/* Meta pills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                        <span style={{
                            padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                            background: typeConfig.bg, color: typeConfig.color,
                            border: `1px solid ${typeConfig.color}40`,
                        }}>
                            {typeConfig.label}
                        </span>
                        {job.location && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                                <MapPin size={10} /> {job.location.length > 22 ? job.location.slice(0, 22) + '…' : job.location}
                            </span>
                        )}
                        {job.experience_level && (
                            <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)', textTransform: 'capitalize' }}>
                                {job.experience_level}
                            </span>
                        )}
                    </div>

                    {/* Divider */}
                    <div style={{ height: 1, background: 'var(--border)', marginBottom: 14 }} />

                    {/* Summary / Description */}
                    <p style={{
                        fontSize: 13,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.65,
                        marginBottom: 14,
                        display: '-webkit-box',
                        WebkitLineClamp: 5,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}>
                        {job.ai_summary || job.description?.slice(0, 320) || 'No description available.'}
                    </p>

                    {/* Skills */}
                    {skills.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                            {skills.map((skill, i) => (
                                <span key={i} style={{
                                    padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                                    background: 'rgba(230,0,35,0.06)',
                                    color: '#e60023',
                                    border: '1px solid rgba(230,0,35,0.12)',
                                }}>
                                    {skill}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            via {job.source}
                        </span>
                        {job.apply_link && (
                            <a
                                href={job.apply_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#e60023', textDecoration: 'none', fontWeight: 600 }}
                            >
                                View posting <ExternalLink size={11} />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

/* ────────────────────────────────────────────
   CardStack
   ──────────────────────────────────────────── */
export function CardStack({ jobs, currentIndex, onSwipe, onCardTap, onRefresh }) {
    const visible = jobs.slice(currentIndex, currentIndex + 3);
    const isEmpty = jobs.length === 0;
    const isDone = !isEmpty && currentIndex >= jobs.length;

    if (isEmpty || isDone) {
        return (
            <div style={{ minHeight: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{ textAlign: 'center', padding: '0 16px' }}
                >
                    <div style={{
                        width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
                        background: isEmpty ? '#f3f3f3' : 'rgba(230,0,35,0.08)',
                        border: `1px solid ${isEmpty ? '#e1e1e1' : 'rgba(230,0,35,0.15)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        {isEmpty ? <Zap size={36} color="#c4c4c4" /> : <Zap size={36} color="#e60023" />}
                    </div>
                    <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                        {isEmpty ? 'No jobs available' : 'All caught up!'}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
                        {isEmpty
                            ? 'The job feed is empty. Make sure the backend scraper has run and your profile is complete.'
                            : "You've reviewed all current jobs. New listings are added regularly!"}
                    </p>
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                padding: '10px 22px', borderRadius: 999, fontSize: 14, fontWeight: 700,
                                background: '#e60023', color: '#fff', border: 'none', cursor: 'pointer',
                                boxShadow: '0 2px 10px rgba(230,0,35,0.3)',
                            }}
                        >
                            <RefreshCw size={15} /> Refresh feed
                        </button>
                    )}
                </motion.div>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', height: 500 }}>
            <AnimatePresence>
                {visible.map((job, i) => (
                    <SwipeCard
                        key={job.id}
                        job={job}
                        isTop={i === 0}
                        onSwipe={i === 0 ? onSwipe : () => {}}
                        onTap={i === 0 && onCardTap ? () => onCardTap(job) : undefined}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}

/* ────────────────────────────────────────────
   SwipeActions
   ──────────────────────────────────────────── */
export function SwipeActions({ onSkip, onSave, onApply, disabled }) {
    const buttons = [
        { onClick: onSkip, cls: 'swipe-btn-skip', icon: <X size={24} color="#f87171" />, label: 'Skip' },
        { onClick: onSave, cls: 'swipe-btn-save', icon: <Bookmark size={22} color="#fbbf24" />, label: 'Save' },
        { onClick: onApply, cls: 'swipe-btn-apply', icon: <Check size={26} color="#fff" />, label: 'Apply' },
    ];

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
            {buttons.map(({ onClick, cls, icon, label }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <motion.button
                        className={`swipe-btn ${cls}`}
                        onClick={onClick}
                        disabled={disabled}
                        whileHover={!disabled ? { scale: 1.12 } : {}}
                        whileTap={!disabled ? { scale: 0.92 } : {}}
                    >
                        {icon}
                    </motion.button>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        {label}
                    </span>
                </div>
            ))}
        </div>
    );
}
