/**
 * Bottom navigation bar — Pinterest light theme
 */

import { Link, useLocation } from 'react-router-dom';
import { Compass, Bookmark, ScanText, LayoutGrid, BarChart3, Settings } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';

const ITEMS = [
    { to: '/discover',        icon: Compass,    label: 'Discover' },
    { to: '/saved',           icon: Bookmark,   label: 'Saved'    },
    { to: '/tracker',         icon: LayoutGrid, label: 'Tracker'  },
    { to: '/resume-analyzer', icon: ScanText,   label: 'Resume'   },
    { to: '/analytics',       icon: BarChart3,  label: 'Stats'    },
];

export function NavBar() {
    const { pathname } = useLocation();

    return (
        <nav className="bottom-nav">
            <div className="bottom-nav-inner" style={{ gap: 0 }}>
                {ITEMS.map(({ to, icon: Icon, label }) => {
                    const active = pathname === to;
                    return (
                        <Link key={to} to={to} className={`nav-item${active ? ' active' : ''}`}>
                            <Icon
                                size={21}
                                strokeWidth={active ? 2.2 : 1.8}
                                color={active ? '#e60023' : 'var(--text-muted)'}
                            />
                            <span style={{ color: active ? '#e60023' : 'var(--text-muted)', fontSize: 9 }}>
                                {label}
                            </span>
                        </Link>
                    );
                })}

                {/* Notification bell + settings stacked in the last slot */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '8px 4px', gap: 2, position: 'relative' }}>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <NotificationCenter />
                        <Link to="/settings" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: pathname === '/settings' ? '#e60023' : 'var(--text-muted)', textDecoration: 'none', padding: 4 }}>
                            <Settings size={18} strokeWidth={pathname === '/settings' ? 2.2 : 1.8} />
                        </Link>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>More</span>
                </div>
            </div>
        </nav>
    );
}
