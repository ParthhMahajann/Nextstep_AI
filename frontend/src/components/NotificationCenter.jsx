/**
 * Notification center — bell icon that shows overdue follow-ups and upcoming interviews.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Calendar, AlertCircle, X, ChevronRight } from 'lucide-react';
import { savedJobsAPI } from '../api/client';

function daysDiff(dateStr) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return Math.round((d - now) / 86400000);
}

export function NotificationCenter() {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const panelRef = useRef(null);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await savedJobsAPI.list({ page_size: 200 });
                const jobs = Array.isArray(res.data) ? res.data : (res.data.results || []);
                const now = new Date();
                const notifs = [];

                jobs.forEach(j => {
                    const job = j.job || j;
                    const title = job.title || 'Job';
                    const company = job.company || '';

                    if (j.interview_date) {
                        const diff = daysDiff(j.interview_date);
                        if (diff >= 0 && diff <= 3) {
                            notifs.push({
                                id: `interview-${j.id}`,
                                type: 'interview',
                                title: `Interview: ${title}`,
                                sub: company,
                                diff,
                                label: diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : `In ${diff} days`,
                                color: diff === 0 ? '#e60023' : '#00a86b',
                            });
                        }
                    }

                    if (j.follow_up_date) {
                        const diff = daysDiff(j.follow_up_date);
                        if (diff <= 0) {
                            notifs.push({
                                id: `followup-${j.id}`,
                                type: 'followup',
                                title: `Follow up: ${title}`,
                                sub: company,
                                diff,
                                label: diff === 0 ? 'Due today' : `Overdue ${Math.abs(diff)}d`,
                                color: '#d97706',
                            });
                        }
                    }
                });

                notifs.sort((a, b) => a.diff - b.diff);
                setItems(notifs);
            } catch {
                // silently fail
            }
        };
        load();
    }, []);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const unread = items.length;

    return (
        <div style={{ position: 'relative' }} ref={panelRef}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 6,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    color: 'var(--text-muted)',
                }}
            >
                <Bell size={20} />
                {unread > 0 && (
                    <span style={{
                        position: 'absolute', top: 1, right: 1,
                        width: 16, height: 16, borderRadius: '50%',
                        background: '#e60023', fontSize: 9, fontWeight: 800,
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid #ffffff',
                    }}>
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        key="notif-panel"
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: 8,
                            width: 280,
                            background: '#ffffff',
                            border: '1px solid #e1e1e1',
                            borderRadius: 16,
                            overflow: 'hidden',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                            zIndex: 300,
                        }}
                    >
                        <div style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</p>
                            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={14} />
                            </button>
                        </div>

                        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                            {items.length === 0 ? (
                                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                    All caught up!
                                </div>
                            ) : (
                                items.map(item => (
                                    <div key={item.id} style={{
                                        padding: '11px 14px',
                                        borderBottom: '1px solid #f5f5f5',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                    }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                            background: item.type === 'interview' ? 'rgba(0,168,107,0.08)' : 'rgba(217,119,6,0.08)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            {item.type === 'interview'
                                                ? <Calendar size={14} color="#00a86b" />
                                                : <AlertCircle size={14} color="#d97706" />
                                            }
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                                            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{item.sub}</p>
                                        </div>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: item.color, flexShrink: 0, background: item.color + '15', padding: '3px 7px', borderRadius: 99 }}>
                                            {item.label}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
