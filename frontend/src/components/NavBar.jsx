import { Link, useLocation } from 'react-router-dom';
import { Compass, Bookmark, ScanText, LayoutGrid, User } from 'lucide-react';

const ITEMS = [
    { to: '/discover',        icon: Compass,    label: 'Discover' },
    { to: '/saved',           icon: Bookmark,   label: 'Saved'    },
    { to: '/tracker',         icon: LayoutGrid, label: 'Tracker'  },
    { to: '/resume-analyzer', icon: ScanText,   label: 'Resume'   },
    { to: '/profile',         icon: User,       label: 'Profile'  },
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
                                size={22}
                                strokeWidth={active ? 2.2 : 1.8}
                                color={active ? '#e60023' : 'var(--text-muted)'}
                            />
                            <span style={{ color: active ? '#e60023' : 'var(--text-muted)', fontSize: 10 }}>
                                {label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
