/**
 * Filter drawer — slides up from bottom on DiscoverPage
 * Includes saved search presets stored in localStorage
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SlidersHorizontal, Bookmark, Trash2, Plus } from 'lucide-react';

const JOB_TYPES = [
    { value: '', label: 'All Types' },
    { value: 'full_time', label: 'Full-time' },
    { value: 'part_time', label: 'Part-time' },
    { value: 'contract', label: 'Contract' },
    { value: 'internship', label: 'Internship' },
    { value: 'freelance', label: 'Freelance' },
];

const EXP_LEVELS = [
    { value: '', label: 'Any Level' },
    { value: 'entry', label: 'Entry Level' },
    { value: 'mid', label: 'Mid Level' },
    { value: 'senior', label: 'Senior' },
    { value: 'lead', label: 'Lead / Manager' },
];

const STORAGE_KEY = 'nextstep_saved_searches';

function loadSavedSearches() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveSavedSearches(searches) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
}

function Chip({ label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '7px 14px', borderRadius: 99, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                background: active ? 'rgba(230,0,35,0.08)' : '#f3f3f3',
                color: active ? '#e60023' : 'var(--text-muted)',
                outline: active ? '1px solid rgba(230,0,35,0.25)' : '1px solid #e1e1e1',
            }}
        >
            {label}
        </button>
    );
}

export function FilterDrawer({ open, filters, onChange, onClose, onApply }) {
    const [savedSearches, setSavedSearches] = useState(loadSavedSearches);
    const [saveName, setSaveName] = useState('');
    const [showSaveInput, setShowSaveInput] = useState(false);

    const set = (key, val) => onChange({ ...filters, [key]: val });

    const saveSearch = () => {
        if (!saveName.trim()) return;
        const updated = [...savedSearches, { name: saveName.trim(), filters }];
        setSavedSearches(updated);
        saveSavedSearches(updated);
        setSaveName('');
        setShowSaveInput(false);
    };

    const deleteSearch = (i) => {
        const updated = savedSearches.filter((_, idx) => idx !== i);
        setSavedSearches(updated);
        saveSavedSearches(updated);
    };

    const applyPreset = (preset) => {
        onChange(preset.filters);
    };

    const hasActiveFilters = Object.values(filters).some(v => v && v !== '' && v !== false);

    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="filter-drawer-backdrop"
                    />

                    {/* Drawer — bottom sheet on mobile, side panel on desktop */}
                    <motion.div
                        initial={isDesktop ? { x: '100%' } : { y: '100%' }}
                        animate={isDesktop ? { x: 0 } : { y: 0 }}
                        exit={isDesktop ? { x: '100%' } : { y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="filter-drawer-panel"
                    >
                        {/* Handle (mobile only) */}
                        {!isDesktop && <div style={{ width: 36, height: 4, borderRadius: 99, background: '#e1e1e1', margin: '8px auto 20px' }} />}

                        {/* Desktop spacer */}
                        {isDesktop && <div style={{ height: 8 }} />}

                        {/* Title */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(230,0,35,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <SlidersHorizontal size={16} color="#e60023" />
                                </div>
                                <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>Filter Jobs</h2>
                            </div>
                            <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, background: '#f3f3f3', border: '1px solid #e1e1e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={16} />
                            </button>
                        </div>

                        {/* Saved Searches */}
                        {savedSearches.length > 0 && (
                            <div style={{ marginBottom: 22 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <Bookmark size={11} /> Saved Searches
                                    </label>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {savedSearches.map((s, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 0, background: '#f3f3f3', border: '1px solid #e1e1e1', borderRadius: 99, overflow: 'hidden' }}>
                                            <button onClick={() => applyPreset(s)} style={{ padding: '6px 12px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                                {s.name}
                                            </button>
                                            <button onClick={() => deleteSearch(i)} style={{ padding: '6px 8px 6px 4px', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                                <Trash2 size={11} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Job Type */}
                        <div style={{ marginBottom: 22 }}>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                                Job Type
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {JOB_TYPES.map(({ value, label }) => (
                                    <Chip key={value} label={label} active={filters.job_type === value} onClick={() => set('job_type', value)} />
                                ))}
                            </div>
                        </div>

                        {/* Experience Level */}
                        <div style={{ marginBottom: 22 }}>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                                Experience Level
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {EXP_LEVELS.map(({ value, label }) => (
                                    <Chip key={value} label={label} active={filters.experience_level === value} onClick={() => set('experience_level', value)} />
                                ))}
                            </div>
                        </div>

                        {/* Remote toggle */}
                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                                Work Mode
                            </label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Chip label="All" active={!filters.remote} onClick={() => set('remote', false)} />
                                <Chip label="Remote Only" active={!!filters.remote} onClick={() => set('remote', true)} />
                            </div>
                        </div>

                        {/* Save search */}
                        {hasActiveFilters && (
                            <div style={{ marginBottom: 16 }}>
                                <AnimatePresence>
                                    {showSaveInput ? (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                            style={{ display: 'flex', gap: 8 }}
                                        >
                                            <input
                                                value={saveName}
                                                onChange={e => setSaveName(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && saveSearch()}
                                                placeholder="Name this search…"
                                                autoFocus
                                                className="input"
                                                style={{ flex: 1, fontSize: 13, padding: '9px 12px' }}
                                            />
                                            <button onClick={saveSearch} style={{ padding: '9px 14px', borderRadius: 10, border: 'none', background: '#e60023', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                                                Save
                                            </button>
                                        </motion.div>
                                    ) : (
                                        <button onClick={() => setShowSaveInput(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(230,0,35,0.2)', background: 'transparent', color: '#e60023', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                            <Plus size={13} /> Save this search
                                        </button>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                onClick={() => onChange({})}
                                style={{ flex: 1, padding: '13px', borderRadius: 14, border: '1px solid #e1e1e1', background: '#f3f3f3', color: 'var(--text-muted)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                            >
                                Clear All
                            </button>
                            <button onClick={onApply} className="btn btn-primary" style={{ flex: 2, padding: '13px', borderRadius: 14 }}>
                                Apply Filters
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
