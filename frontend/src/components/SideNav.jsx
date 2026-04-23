/**
 * Left sidebar navigation — full-height, desktop primary, mobile icon-only
 */

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Compass, Bookmark, ScanText, LayoutGrid, BarChart3,
    Settings, User, Zap, Bell, ChevronRight, LogOut,
    Home
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { NotificationCenter } from './NotificationCenter';

const NAV_ITEMS = [
    { to: '/discover',        icon: Compass,    label: 'Discover',   desc: 'Swipe jobs' },
    { to: '/saved',           icon: Bookmark,   label: 'Saved',      desc: 'Your saved jobs' },
    { to: '/tracker',         icon: LayoutGrid, label: 'Tracker',    desc: 'Kanban pipeline' },
    { to: '/resume-analyzer', icon: ScanText,   label: 'Resume',     desc: 'AI analysis' },
    { to: '/analytics',       icon: BarChart3,  label: 'Analytics',  desc: 'Your stats' },
];

export function SideNav() {
    const { pathname } = useLocation();
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const initials = user
        ? ((user.first_name || '')[0] + (user.last_name || '')[0]).toUpperCase() || (user.username || 'U')[0].toUpperCase()
        : 'U';

    const displayName = user?.first_name
        ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`
        : user?.username || 'User';

    return (
        <aside className="side-nav">
            {/* Logo */}
            <div className="side-nav-logo">
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                    <div className="logo-mark" style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }}>
                        <Zap size={17} color="#fff" strokeWidth={2.5} />
                    </div>
                    <span className="side-nav-label" style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                        Next<span style={{ color: '#e60023' }}>Step</span>
                    </span>
                </Link>
            </div>

            {/* Section label */}
            <div className="side-nav-section-label side-nav-label">MAIN</div>

            {/* Primary nav */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 8px' }}>
                {NAV_ITEMS.map(({ to, icon: Icon, label, desc }) => {
                    const active = pathname === to;
                    return (
                        <Link
                            key={to}
                            to={to}
                            className={`side-nav-item${active ? ' active' : ''}`}
                            title={label}
                        >
                            <div className={`side-nav-icon${active ? ' active' : ''}`}>
                                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                            </div>
                            <div className="side-nav-label side-nav-item-text">
                                <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#e60023' : 'var(--text-primary)' }}>
                                    {label}
                                </span>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1 }}>{desc}</span>
                            </div>
                            {active && (
                                <motion.div
                                    layoutId="side-active-pill"
                                    style={{
                                        position: 'absolute', right: 8, width: 3, height: 18,
                                        borderRadius: 99, background: '#e60023',
                                    }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Section label */}
            <div className="side-nav-section-label side-nav-label">ACCOUNT</div>

            {/* Secondary nav */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 8px' }}>
                <Link
                    to="/profile"
                    className={`side-nav-item${pathname === '/profile' ? ' active' : ''}`}
                    title="Profile"
                >
                    <div className={`side-nav-icon${pathname === '/profile' ? ' active' : ''}`}>
                        <User size={18} strokeWidth={pathname === '/profile' ? 2.2 : 1.8} />
                    </div>
                    <div className="side-nav-label side-nav-item-text">
                        <span style={{ fontSize: 13, fontWeight: pathname === '/profile' ? 700 : 500, color: pathname === '/profile' ? '#e60023' : 'var(--text-primary)' }}>
                            Profile
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1 }}>Edit your details</span>
                    </div>
                </Link>
                <Link
                    to="/settings"
                    className={`side-nav-item${pathname === '/settings' ? ' active' : ''}`}
                    title="Settings"
                >
                    <div className={`side-nav-icon${pathname === '/settings' ? ' active' : ''}`}>
                        <Settings size={18} strokeWidth={pathname === '/settings' ? 2.2 : 1.8} />
                    </div>
                    <div className="side-nav-label side-nav-item-text">
                        <span style={{ fontSize: 13, fontWeight: pathname === '/settings' ? 700 : 500, color: pathname === '/settings' ? '#e60023' : 'var(--text-primary)' }}>
                            Settings
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1 }}>Preferences</span>
                    </div>
                </Link>
            </nav>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Notifications (desktop inline) */}
            <div className="side-nav-label" style={{ padding: '0 16px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <NotificationCenter />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Alerts</span>
            </div>

            {/* User footer */}
            <div className="side-nav-user">
                <Link to="/profile" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <div style={{
                        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                        background: '#e60023', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff',
                    }}>
                        {initials}
                    </div>
                    <div className="side-nav-label" style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {displayName}
                        </p>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user?.email || ''}
                        </p>
                    </div>
                </Link>
                <button
                    onClick={handleLogout}
                    title="Sign out"
                    className="side-nav-label"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', flexShrink: 0 }}
                >
                    <LogOut size={15} />
                </button>
            </div>
        </aside>
    );
}
