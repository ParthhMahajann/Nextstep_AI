/**
 * Settings page — account preferences and danger zone.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, LogOut, Trash2, ChevronRight, Shield, Bell, User, Zap } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../api/client';

function SectionHeader({ icon: Icon, label }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Icon size={14} color="#e60023" />
            <p style={{ fontSize: 11, fontWeight: 700, color: '#e60023', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
        </div>
    );
}

function SettingRow({ label, sub, onClick, danger, rightElement }) {
    return (
        <button
            onClick={onClick}
            style={{
                width: '100%',
                background: 'none',
                border: 'none',
                cursor: onClick ? 'pointer' : 'default',
                padding: '13px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #f0f0f0',
                textAlign: 'left',
            }}
        >
            <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: danger ? '#f87171' : 'var(--text-primary)' }}>{label}</p>
                {sub && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</p>}
            </div>
            {rightElement || (onClick && <ChevronRight size={16} color="var(--text-muted)" />)}
        </button>
    );
}

function Toggle({ value, onChange }) {
    return (
        <div
            onClick={() => onChange(!value)}
            style={{
                width: 40, height: 22, borderRadius: 99,
                background: value ? '#e60023' : '#e1e1e1',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
            }}
        >
            <motion.div
                animate={{ x: value ? 20 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                style={{ position: 'absolute', top: 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}
            />
        </div>
    );
}

export function SettingsPage() {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const [emailNotifs, setEmailNotifs] = useState(true);
    const [pushNotifs, setPushNotifs] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            const refresh = localStorage.getItem('refresh_token');
            if (refresh) await authAPI.logout({ refresh });
        } catch { /* ignore */ }
        logout();
        navigate('/login');
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="logo-mark" style={{ width: 32, height: 32, borderRadius: 10 }}>
                        <Zap size={15} color="#fff" strokeWidth={2.5} />
                    </div>
                    <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                        Settings
                    </h1>
                </div>
            </header>

            <main style={{ maxWidth: 560, width: '100%', margin: '0 auto', padding: '20px 16px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Account info */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                    <SectionHeader icon={User} label="Account" />
                    <div style={{ background: '#ffffff', border: '1px solid #e1e1e1', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: 12,
                                background: '#e60023',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 18, fontWeight: 800, color: '#fff',
                            }}>
                                {(user?.first_name || user?.username || '?')[0].toUpperCase()}
                            </div>
                            <div>
                                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.username}
                                </p>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</p>
                            </div>
                        </div>
                        <SettingRow
                            label="Edit Profile"
                            sub="Update name, bio, experience level"
                            onClick={() => navigate('/profile')}
                        />
                    </div>
                </motion.div>

                {/* Notifications */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                    <SectionHeader icon={Bell} label="Notifications" />
                    <div style={{ background: '#ffffff', border: '1px solid #e1e1e1', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                        <SettingRow
                            label="Email notifications"
                            sub="Interview reminders, follow-up alerts"
                            rightElement={<Toggle value={emailNotifs} onChange={setEmailNotifs} />}
                        />
                        <SettingRow
                            label="Push notifications"
                            sub="In-app alerts"
                            rightElement={<Toggle value={pushNotifs} onChange={setPushNotifs} />}
                        />
                    </div>
                </motion.div>

                {/* Privacy */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <SectionHeader icon={Shield} label="Privacy" />
                    <div style={{ background: '#ffffff', border: '1px solid #e1e1e1', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                        <SettingRow
                            label="Data & Privacy"
                            sub="How we use your data"
                        />
                        <SettingRow
                            label="Export my data"
                            sub="Download a copy of your account data"
                        />
                    </div>
                </motion.div>

                {/* Danger zone */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <SectionHeader icon={Settings} label="Account Actions" />
                    <div style={{ background: 'rgba(248,113,113,0.03)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 16, overflow: 'hidden' }}>
                        <SettingRow
                            label="Sign out"
                            sub="Sign out of this device"
                            onClick={loggingOut ? null : handleLogout}
                            rightElement={
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f87171' }}>
                                    {loggingOut ? <span style={{ fontSize: 12 }}>Signing out…</span> : <LogOut size={16} />}
                                </div>
                            }
                        />
                        {!showDeleteConfirm ? (
                            <SettingRow
                                label="Delete account"
                                sub="Permanently delete your account and all data"
                                danger
                                onClick={() => setShowDeleteConfirm(true)}
                                rightElement={<Trash2 size={16} color="#f87171" />}
                            />
                        ) : (
                            <div style={{ padding: '14px 16px' }}>
                                <p style={{ fontSize: 13, color: '#f87171', marginBottom: 12, fontWeight: 600 }}>
                                    Are you sure? This cannot be undone.
                                </p>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: '#f3f3f3', border: '1px solid #e1e1e1', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                    NextStep AI · v1.0
                </p>
            </main>
        </div>
    );
}
