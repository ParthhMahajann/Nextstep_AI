# Mobile Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every page of the NextStep AI web app feel like a native mobile app on 375px+ screens without touching any desktop layout.

**Architecture:** Add a shared `useIsMobile()` hook that reads `window.matchMedia`; use it in components that need variant behaviour (full-screen vs sheet); handle the rest with CSS `@media (max-width: 767px)` rules added to `index.css` and new `.auth-page` / `.landing-*` utility classes. No new routes or stores.

**Tech Stack:** React 18, Framer Motion, Tailwind (via `@import "tailwindcss"`), lucide-react, inline JSX styles (project convention), CSS custom properties (`var(--xxx)`).

---

## File Map

| File | Change |
|------|--------|
| `frontend/index.html` | viewport-fit=cover, theme-color, PWA meta |
| `frontend/src/index.css` | safe areas, hover guard, :active, touch targets, mobile input font-size, auth/landing util classes |
| `frontend/src/hooks/useIsMobile.js` | **NEW** — matchMedia hook |
| `frontend/src/components/NavBar.jsx` | 5-item nav, drop NotificationCenter + Settings |
| `frontend/src/components/JobDetailSheet.jsx` | full-screen on mobile via useIsMobile |
| `frontend/src/components/SwipeCard.jsx` | dynamic card height |
| `frontend/src/components/ApplyModal.jsx` | full-screen on mobile |
| `frontend/src/components/OnboardingModal.jsx` | full-screen on mobile |
| `frontend/src/pages/DiscoverPage.jsx` | 44px header buttons |
| `frontend/src/pages/KanbanPage.jsx` | horizontal scroll + snap + dot indicators |
| `frontend/src/pages/AnalyticsPage.jsx` | responsive stat-card grid |
| `frontend/src/pages/SavedJobsPage.jsx` | padding + tap area |
| `frontend/src/pages/ProfilePage.jsx` | add NotificationCenter + Settings link |
| `frontend/src/pages/SettingsPage.jsx` | sign-out row min-height |
| `frontend/src/pages/ResumeAnalyzerPage.jsx` | tap-to-upload on mobile |
| `frontend/src/pages/LandingPage.jsx` | responsive hero, grids, CTA |
| `frontend/src/pages/LoginPage.jsx` | full-screen, 16px inputs, autocomplete |
| `frontend/src/pages/SignupPage.jsx` | full-screen, 16px inputs, autocomplete |
| `frontend/src/pages/ForgotPasswordPage.jsx` | full-screen, 16px inputs |
| `frontend/src/pages/ResetPasswordPage.jsx` | full-screen, 16px inputs |

---

## Task 1: Foundation — index.html + useIsMobile hook + index.css

**Files:**
- Modify: `frontend/index.html`
- Create: `frontend/src/hooks/useIsMobile.js`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Update index.html viewport meta and add PWA tags**

Replace the existing viewport `<meta>` and add tags after it:

```html
<!-- frontend/index.html — replace the existing viewport meta with these four lines -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#ffffff" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
```

- [ ] **Step 2: Create useIsMobile hook**

Create `frontend/src/hooks/useIsMobile.js`:

```js
import { useState, useEffect } from 'react';

export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(
        () => window.matchMedia('(max-width: 767px)').matches
    );
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)');
        const handler = (e) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);
    return isMobile;
}
```

- [ ] **Step 3: Add global mobile CSS to index.css**

Append the following block to the end of `frontend/src/index.css`:

```css
/* ══════════════���════════════════════════════════════════════
   MOBILE-FIRST GLOBAL FIXES
   ═══════════════════════════════════════════════════════════ */

/* Safe area insets — iPhone notch / home indicator */
.bottom-nav {
  padding-bottom: max(12px, env(safe-area-inset-bottom));
}

@media (max-width: 767px) {
  .page {
    padding-bottom: calc(80px + env(safe-area-inset-bottom));
  }
}

/* Prevent iOS auto-zoom on input focus (requires font-size >= 16px) */
@media (max-width: 767px) {
  input, select, textarea {
    font-size: 16px !important;
  }
}

/* Guard hover transforms — touch devices don't have hover,
   so transform: translateY(-1px) would stick after tap */
@media (hover: hover) {
  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
  }
  .glass-card:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--border-hover);
  }
  .swipe-btn:hover:not(:disabled) {
    transform: scale(1.1);
    box-shadow: var(--shadow-md);
  }
}

/* Active (press) feedback for touch */
.btn:active:not(:disabled) {
  transform: scale(0.97);
}
.swipe-btn:active:not(:disabled) {
  transform: scale(0.93) !important;
}
.nav-item:active {
  opacity: 0.7;
}

/* Prevent pull-to-refresh from firing inside scrollable modals */
.modal-scroll {
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
}

/* Touch target helpers — bump icon buttons to 44px on mobile */
@media (max-width: 767px) {
  .btn-icon {
    width: 44px !important;
    height: 44px !important;
  }
}

/* Auth pages — full-screen on mobile */
.auth-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  z-index: 1;
}

@media (max-width: 767px) {
  .auth-page {
    align-items: flex-start;
    padding: 48px 24px 40px;
  }
  .auth-card {
    max-width: 100% !important;
    width: 100% !important;
  }
}

/* Landing page responsive grid utilities */
.landing-features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.landing-sources-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
.landing-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.landing-job-types-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

@media (max-width: 767px) {
  .landing-features-grid {
    grid-template-columns: 1fr;
  }
  .landing-sources-grid {
    grid-template-columns: 1fr;
  }
  .landing-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

- [ ] **Step 4: Verify foundation**

Run the dev server (`npm run dev` inside `frontend/`) and open `http://localhost:3000` in Chrome DevTools with device set to **iPhone SE (375×667)**. Confirm:
- No horizontal scroll on the body
- Browser chrome (address bar) uses white theme color
- Console shows no errors

- [ ] **Step 5: Commit**

```bash
git add frontend/index.html frontend/src/index.css frontend/src/hooks/useIsMobile.js
git commit -m "feat(mobile): add useIsMobile hook, safe area insets, global touch CSS"
```

---

## Task 2: NavBar — 5-Item Clean Nav

**Files:**
- Modify: `frontend/src/components/NavBar.jsx`

- [ ] **Step 1: Rewrite NavBar to 5 items, remove cramped More slot**

Replace the entire contents of `frontend/src/components/NavBar.jsx`:

```jsx
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
```

- [ ] **Step 2: Verify**

At 375px device width:
- Bottom nav shows exactly 5 equally spaced items
- Profile tab is rightmost item
- No overflow or text clipping

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/NavBar.jsx
git commit -m "feat(mobile): replace 6-slot bottom nav with clean 5-item nav"
```

---

## Task 3: JobDetailSheet — Full-Screen on Mobile

**Files:**
- Modify: `frontend/src/components/JobDetailSheet.jsx`

- [ ] **Step 1: Import useIsMobile and add mobile/desktop variant styles**

At the top of `frontend/src/components/JobDetailSheet.jsx`, add the import after the existing imports:

```jsx
import { useIsMobile } from '../hooks/useIsMobile';
```

Inside the `JobDetailSheet` component, add the hook call right after the existing `useState` calls:

```jsx
export function JobDetailSheet({ job, onClose, onApply, onSave }) {
    const isMobile = useIsMobile();
    const [showInterviewPrep, setShowInterviewPrep] = useState(false);
    // ... rest of existing state unchanged
```

- [ ] **Step 2: Replace the Sheet motion.div with mobile/desktop variants**

Find the `{/* Sheet */}` motion.div that starts with `initial={{ y: '100%' }}` and replace it with:

```jsx
{/* Sheet — full-screen on mobile, 90vh sheet on desktop */}
<motion.div
    initial={{ y: '100%' }}
    animate={{ y: 0 }}
    exit={{ y: '100%' }}
    transition={{ type: 'spring', damping: 30, stiffness: 310 }}
    style={isMobile ? {
        position: 'fixed', inset: 0, zIndex: 301,
        background: '#ffffff',
        display: 'flex', flexDirection: 'column',
    } : {
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301,
        background: '#ffffff',
        border: '1px solid #e1e1e1', borderBottom: 'none',
        borderRadius: '24px 24px 0 0',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.12)',
    }}
>
```

- [ ] **Step 3: Replace the handle + header row for mobile**

Find the `{/* Handle */}` div and the `{/* Header row */}` div inside the scrollable body. Replace the handle with a conditional:

```jsx
{/* Handle — desktop only */}
{!isMobile && (
    <div style={{ width: 36, height: 4, borderRadius: 99, background: '#e1e1e1', margin: '10px auto 0' }} />
)}

{/* Mobile top bar with back button */}
{isMobile && (
    <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid #f0f0f0',
        flexShrink: 0,
        paddingTop: 'max(12px, env(safe-area-inset-top))',
    }}>
        <button
            onClick={onClose}
            style={{
                width: 44, height: 44, borderRadius: 12,
                background: '#f3f3f3', border: '1px solid #e1e1e1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0,
            }}
        >
            <X size={18} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{job.title}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{job.company}{job.location ? ` · ${job.location}` : ''}</p>
        </div>
    </div>
)}
```

- [ ] **Step 4: Remove desktop header row close button on mobile + add modal-scroll class**

On the scrollable body div, add `className="modal-scroll"`:

```jsx
<div className="modal-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 32px' }}>
```

Find the header row `{/* Header row */}` div and make its close button desktop-only:

```jsx
{/* Header row — desktop only (mobile has top bar above) */}
{!isMobile && (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        {/* ... existing header row content unchanged ... */}
    </div>
)}
{/* Mobile: just the chips below the top bar */}
```

- [ ] **Step 5: Update footer safe-area padding**

Find the `{/* Footer CTA */}` div and update its style:

```jsx
<div style={{
    padding: '12px 20px',
    paddingBottom: 'max(36px, calc(12px + env(safe-area-inset-bottom)))',
    borderTop: '1px solid #f0f0f0',
    display: 'flex', gap: 10, background: '#ffffff',
    flexShrink: 0,
}}>
```

- [ ] **Step 6: Conditionally render backdrop (desktop only)**

```jsx
{/* Backdrop — desktop only; mobile fills whole screen, no overlay needed */}
{!isMobile && (
    <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
    />
)}
```

- [ ] **Step 7: Verify**

At 375px device:
- Tap a job card → sheet fills entire screen, no grey overlay visible
- Back button (←) in top bar closes the sheet
- Content scrolls between the sticky top bar and sticky Save/Apply footer
- Footer clears iPhone home indicator

At desktop (≥768px):
- Backdrop appears, sheet slides up from bottom as before, ✕ button present

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/JobDetailSheet.jsx
git commit -m "feat(mobile): full-screen job detail on mobile, sheet on desktop"
```

---

## Task 4: SwipeCard + DiscoverPage — Dynamic Height & Touch Targets

**Files:**
- Modify: `frontend/src/components/SwipeCard.jsx`
- Modify: `frontend/src/pages/DiscoverPage.jsx`

- [ ] **Step 1: Fix CardStack height to be dynamic**

In `frontend/src/components/SwipeCard.jsx`, find the `CardStack` return and replace the fixed `height: 500`:

```jsx
// Find this line in CardStack:
<div style={{ position: 'relative', height: 500 }}>

// Replace with:
<div style={{ position: 'relative', height: 'min(500px, calc(100dvh - 260px))' }}>
```

The 260px accounts for sticky header (≈64px) + bottom nav (≈80px) + swipe actions (≈80px) + swipe hints (≈36px).

- [ ] **Step 2: Bump header icon buttons in DiscoverPage to 44px**

In `frontend/src/pages/DiscoverPage.jsx`, find all three header icon buttons (Search, Filter, Refresh). Each has `width: 36, height: 36`. Change all three to `width: 44, height: 44`.

Search button:
```jsx
<button onClick={() => setShowSearch(true)}
    style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
    <Search size={16} />
</button>
```

Filter button (keep existing position + color logic, just change the size):
```jsx
style={{ width: 44, height: 44, borderRadius: '50%', ... }}
```

Refresh button:
```jsx
style={{ width: 44, height: 44, borderRadius: '50%', ... }}
```

- [ ] **Step 3: Replace text swipe hints with icon pills**

In `DiscoverPage.jsx`, find the hints `motion.div` at the bottom of the card section:

```jsx
// Replace the hints div:
<motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
    style={{ marginTop: 16, textAlign: 'center' }}
>
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: '#f3f3f3', border: '1px solid #e1e1e1', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
            ← Skip
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', fontSize: 11, color: '#d97706', fontWeight: 600 }}>
            ↑ Save
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: 'rgba(230,0,35,0.08)', border: '1px solid rgba(230,0,35,0.2)', fontSize: 11, color: '#e60023', fontWeight: 600 }}>
            → Apply · tap for details
        </span>
    </div>
</motion.div>
```

- [ ] **Step 4: Verify**

At 375×667 (iPhone SE): card stack should not overflow below the swipe action buttons.
At 375×812 (iPhone 12): card should show at close to full height.
At desktop: no visual change from before.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/SwipeCard.jsx frontend/src/pages/DiscoverPage.jsx
git commit -m "feat(mobile): dynamic swipe card height, 44px header targets, icon hints"
```

---

## Task 5: ApplyModal + OnboardingModal — Full-Screen on Mobile

**Files:**
- Modify: `frontend/src/components/ApplyModal.jsx`
- Modify: `frontend/src/components/OnboardingModal.jsx`

- [ ] **Step 1: Make ApplyModal full-screen on mobile**

In `frontend/src/components/ApplyModal.jsx`, add the useIsMobile import at the top:

```jsx
import { useIsMobile } from '../hooks/useIsMobile';
```

Find the exported `ApplyModal` function and add the hook:

```jsx
export function ApplyModal({ job, onClose, onApply }) {
    const isMobile = useIsMobile();
    // ... rest of existing code
```

Find the outermost `motion.div` (the backdrop, `style={{ position: 'fixed', inset: 0, ..., display: 'flex', alignItems: 'flex-end' }}`). Change `alignItems` conditionally:

```jsx
style={{
    position: 'fixed', inset: 0,
    background: isMobile ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.6)',
    backdropFilter: isMobile ? 'none' : 'blur(6px)',
    display: 'flex',
    alignItems: isMobile ? 'stretch' : 'flex-end',
    justifyContent: 'center',
    zIndex: 350,
}}
```

Find the inner `motion.div` (the white panel). Add conditional styles:

```jsx
style={isMobile ? {
    width: '100%',
    height: '100dvh',
    background: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
} : {
    // existing desktop styles — keep unchanged
    width: '100%',
    maxWidth: 520,
    background: '#ffffff',
    borderRadius: '24px 24px 0 0',
    border: '1px solid #e1e1e1',
    borderBottom: 'none',
    maxHeight: '88vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 -8px 40px rgba(0,0,0,0.12)',
}}
```

Add a mobile back button in the modal header (where the existing `✕` button is). Find the header div and add:

```jsx
{isMobile && (
    <button onClick={onClose} style={{ width: 44, height: 44, borderRadius: 12, background: '#f3f3f3', border: '1px solid #e1e1e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
        <X size={18} />
    </button>
)}
```

Add `className="modal-scroll"` to the scrollable body div inside ApplyModal.

- [ ] **Step 2: Make OnboardingModal full-screen on mobile**

In `frontend/src/components/OnboardingModal.jsx`, add import:

```jsx
import { useIsMobile } from '../hooks/useIsMobile';
```

Find the exported component function and add the hook. Then find the inner white card `motion.div` (the one with `style={{ position: 'fixed', inset: 0, zIndex: 501, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', pointerEvents: 'none' }}`).

Change that container and the white card:

```jsx
{/* Modal container */}
<motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    transition={{ type: 'spring', damping: 22, stiffness: 280 }}
    style={isMobile ? {
        position: 'fixed', inset: 0, zIndex: 501,
        background: '#ffffff',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center',
        padding: '32px 24px',
        pointerEvents: 'all',
    } : {
        position: 'fixed', inset: 0, zIndex: 501,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px',
        pointerEvents: 'none',
    }}
>
    {/* Inner card — desktop only wraps content in a card */}
    <div style={isMobile ? { width: '100%' } : {
        background: '#ffffff',
        borderRadius: 28,
        padding: '36px 32px',
        maxWidth: 420,
        width: '100%',
        pointerEvents: 'all',
        boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
        border: '1px solid #e8e8e8',
    }}>
        {/* existing step content unchanged */}
    </div>
</motion.div>
```

- [ ] **Step 3: Verify**

At 375px: both modals fill the entire screen, no floating card.
At desktop: modals appear centered with backdrop as before.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ApplyModal.jsx frontend/src/components/OnboardingModal.jsx
git commit -m "feat(mobile): full-screen apply modal and onboarding on mobile"
```

---

## Task 6: KanbanPage — Horizontal Scroll + Snap + Dot Indicators

**Files:**
- Modify: `frontend/src/pages/KanbanPage.jsx`

- [ ] **Step 1: Add useIsMobile and useRef imports**

At the top of `frontend/src/pages/KanbanPage.jsx`, add:

```jsx
import { useEffect, useState, useRef } from 'react';  // add useRef
import { useIsMobile } from '../hooks/useIsMobile';
```

Inside the main `KanbanPage` component function, add:

```jsx
const isMobile = useIsMobile();
const scrollRef = useRef(null);
const [activeColIndex, setActiveColIndex] = useState(0);
```

- [ ] **Step 2: Add scroll tracking effect**

Add this effect inside the `KanbanPage` component, after the existing data-fetching `useEffect`:

```jsx
useEffect(() => {
    if (!isMobile) return;
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
        const colWidth = el.scrollWidth / COLUMNS.length;
        setActiveColIndex(Math.round(el.scrollLeft / colWidth));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
}, [isMobile]);
```

- [ ] **Step 3: Wrap the columns container with mobile scroll styles**

Find the div that renders all 6 columns (the direct parent of the individual column divs). It likely looks like `<div style={{ display: 'flex', gap: ..., padding: ... }}>`. Wrap it conditionally:

```jsx
<div
    ref={isMobile ? scrollRef : undefined}
    style={isMobile ? {
        display: 'flex',
        gap: 12,
        overflowX: 'auto',
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 8,
        paddingLeft: 16,
        paddingRight: 16,
        /* Hide scrollbar visually but keep it functional */
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
    } : {
        display: 'flex',
        gap: 16,
        overflowX: 'auto',
        paddingBottom: 16,
        alignItems: 'flex-start',
    }}
>
    {/* column divs here */}
</div>
```

- [ ] **Step 4: Add scrollSnapAlign to each column div on mobile**

Each column div (the per-column container rendered in the COLUMNS.map) needs `minWidth` and `scrollSnapAlign` on mobile. Find the per-column container style and update it:

```jsx
// In the COLUMNS.map, find the column container div style.
// Add these properties:
style={{
    // existing styles...
    minWidth: isMobile ? 260 : 280,
    flexShrink: 0,
    scrollSnapAlign: isMobile ? 'start' : undefined,
}}
```

- [ ] **Step 5: Add column indicator dots below the board**

After the columns container closing `</div>`, add:

```jsx
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
```

- [ ] **Step 6: Verify**

At 375px: only one column visible at a time; swiping left/right snaps to next column; dots update as you scroll.
At desktop: all 6 columns visible in a horizontal scroll (desktop unchanged).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/KanbanPage.jsx
git commit -m "feat(mobile): kanban horizontal scroll with snap and column indicator dots"
```

---

## Task 7: AnalyticsPage + SavedJobsPage — Responsive Grids

**Files:**
- Modify: `frontend/src/pages/AnalyticsPage.jsx`
- Modify: `frontend/src/pages/SavedJobsPage.jsx`

- [ ] **Step 1: Add responsive stat-card grid to AnalyticsPage**

In `frontend/src/pages/AnalyticsPage.jsx`, find where the 4 `StatCard` components are rendered. They're likely in a grid container. Find that container div and update:

```jsx
// Find the stat cards container and replace its style:
<div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 12,
    marginBottom: 24,
}}>
    {/* StatCard components */}
</div>
```

`auto-fit` with `minmax(160px, 1fr)` means:
- On 375px (mobile): 2 columns (2 × 160px = 320px fits)
- On 768px+: 4 columns

- [ ] **Step 2: Fix AnalyticsPage page padding**

Find the main container of `AnalyticsPage` (the `.page` div) and ensure the inner content has consistent horizontal padding. Add `padding: '20px 16px 24px'` to the inner `<main>` or equivalent container if it doesn't already have it.

- [ ] **Step 3: Fix SavedJobsPage card padding and tap area**

In `frontend/src/pages/SavedJobsPage.jsx`, find each job card's container style. The cards render inside a list. Ensure each card has:

```jsx
style={{
    // existing styles preserved...
    padding: '14px 16px',  // was likely less
    cursor: 'pointer',
    minHeight: 64,  // ensures 44px+ tap area via padding
}}
```

If the expand/collapse section trigger button is smaller than 44px tall, update its `padding` to `'12px 16px'`.

- [ ] **Step 4: Verify**

Analytics at 375px: 4 stat cards display as 2×2 grid, not overflowing.
Saved jobs at 375px: cards have comfortable tap areas.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/AnalyticsPage.jsx frontend/src/pages/SavedJobsPage.jsx
git commit -m "feat(mobile): responsive analytics grid, saved jobs tap areas"
```

---

## Task 8: ProfilePage + SettingsPage — Notifications & Sign Out

**Files:**
- Modify: `frontend/src/pages/ProfilePage.jsx`
- Modify: `frontend/src/pages/SettingsPage.jsx`

- [ ] **Step 1: Add NotificationCenter to ProfilePage**

In `frontend/src/pages/ProfilePage.jsx`, add the import:

```jsx
import { NotificationCenter } from '../components/NotificationCenter';
```

Find the profile page header section (where the user avatar and name are shown). Add `NotificationCenter` and a Settings link to the top-right of the header:

```jsx
{/* Profile header action row */}
<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginBottom: 16 }}>
    <NotificationCenter />
    <Link
        to="/settings"
        style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', textDecoration: 'none',
        }}
    >
        <Settings size={18} />
    </Link>
</div>
```

Add the `Settings` and `Link` imports if not already present:

```jsx
import { Settings } from 'lucide-react';  // add Settings to existing lucide import
import { Link } from 'react-router-dom';  // already imported
```

- [ ] **Step 2: Ensure SettingsPage sign-out row is easy to tap**

In `frontend/src/pages/SettingsPage.jsx`, find the Sign Out `SettingRow`. Ensure the button style in `SettingRow` has `minHeight: 52`:

```jsx
function SettingRow({ label, sub, onClick, danger, rightElement }) {
    return (
        <button
            onClick={onClick}
            style={{
                width: '100%',
                background: 'none',
                border: 'none',
                cursor: onClick ? 'pointer' : 'default',
                padding: '14px 16px',   // was 13px
                minHeight: 52,           // add this
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #f0f0f0',
                textAlign: 'left',
            }}
        >
```

- [ ] **Step 3: Fix ProfilePage form section spacing on mobile**

In `frontend/src/pages/ProfilePage.jsx`, find any section that renders a label + input inline (side-by-side). On the profile page these typically appear as `display: 'flex', alignItems: 'center'` rows. Add a CSS class or update the section containers to stack vertically on mobile.

Add the following to `frontend/src/index.css` (append after the landing utilities block added in Task 1):

```css
/* Profile form — stack label above input on mobile */
@media (max-width: 767px) {
  .profile-field-row {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 6px !important;
  }
  .profile-field-row label {
    min-width: unset !important;
    width: 100% !important;
  }
}
```

Then in `ProfilePage.jsx`, add `className="profile-field-row"` to each label+input wrapper div in the form sections.

Also ensure the skill tags `<input>` (the text field for adding new skills) has `style={{ width: '100%' }}` on mobile. Find the skill input and update:

```jsx
<input
    // ... existing props
    style={{
        // existing styles
        width: '100%',
        minWidth: 0,
    }}
/>
```

- [ ] **Step 4: Verify**

Profile page at 375px: notification bell and settings gear icon visible top-right.
Form fields stack label-above-input, not side-by-side.
Settings page: all rows are comfortably tappable (≥52px tall).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ProfilePage.jsx frontend/src/pages/SettingsPage.jsx frontend/src/index.css
git commit -m "feat(mobile): add notifications + settings to profile, fix form layout, improve tap targets"
```

---

## Task 9: ResumeAnalyzerPage — Tap-to-Upload on Mobile

**Files:**
- Modify: `frontend/src/pages/ResumeAnalyzerPage.jsx`

- [ ] **Step 1: Add useIsMobile import**

```jsx
import { useIsMobile } from '../hooks/useIsMobile';
```

Add the hook inside the component that contains the file upload area:

```jsx
const isMobile = useIsMobile();
```

- [ ] **Step 2: Update upload zone to show tap-friendly UI on mobile**

Find the file upload drop-zone div (it likely contains "Drag and drop" text and an `Upload` icon). Update its contents conditionally:

```jsx
{/* Upload zone */}
<div
    onClick={() => fileInputRef.current?.click()}
    style={{
        border: '2px dashed var(--border)',
        borderRadius: 16,
        padding: isMobile ? '32px 20px' : '40px 20px',
        textAlign: 'center',
        cursor: 'pointer',
        background: 'var(--bg-surface)',
        transition: 'border-color 0.2s',
    }}
    onMouseOver={e => !isMobile && (e.currentTarget.style.borderColor = '#e60023')}
    onMouseOut={e => !isMobile && (e.currentTarget.style.borderColor = 'var(--border)')}
>
    <Upload size={isMobile ? 32 : 40} color="var(--text-muted)" style={{ marginBottom: 12 }} />
    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
        {isMobile ? 'Tap to upload resume' : 'Drop your resume here'}
    </p>
    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        {isMobile ? 'PDF, DOC, or DOCX' : 'or click to browse — PDF, DOC, DOCX'}
    </p>
</div>
```

Ensure the file input has the correct `accept` attribute:

```jsx
<input
    ref={fileInputRef}
    type="file"
    accept=".pdf,.doc,.docx"
    style={{ display: 'none' }}
    onChange={handleFileChange}
/>
```

- [ ] **Step 3: Verify**

At 375px: upload zone shows "Tap to upload resume", tapping it opens the native file picker.
At desktop: "Drop your resume here" text, drag-and-drop still works.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ResumeAnalyzerPage.jsx
git commit -m "feat(mobile): tap-to-upload resume, mobile-friendly drop zone"
```

---

## Task 10: Auth Pages — Full-Screen on Mobile

**Files:**
- Modify: `frontend/src/pages/LoginPage.jsx`
- Modify: `frontend/src/pages/SignupPage.jsx`
- Modify: `frontend/src/pages/ForgotPasswordPage.jsx`
- Modify: `frontend/src/pages/ResetPasswordPage.jsx`

- [ ] **Step 1: Update LoginPage outer container and inner card**

In `frontend/src/pages/LoginPage.jsx`, find the outermost `div` (the one with `minHeight: '100dvh', display: 'flex', alignItems: 'center'`). Replace its `style` with a `className`:

```jsx
<div className="auth-page">
    <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="auth-card"
        style={{ width: '100%', maxWidth: '420px' }}
    >
```

Add `autocomplete` attributes to inputs:

```jsx
<input
    type="email"
    autoComplete="email"
    // ... rest unchanged
/>
<input
    type={showPw ? 'text' : 'password'}
    autoComplete="current-password"
    // ... rest unchanged
/>
```

- [ ] **Step 2: Update SignupPage the same way**

In `frontend/src/pages/SignupPage.jsx` (or `SignupWizard.jsx` if that's what's routed), apply the same `className="auth-page"` to the outer div and `className="auth-card"` to the inner motion.div. Add `autoComplete="new-password"` to password fields and `autoComplete="email"` to email field.

- [ ] **Step 3: Update ForgotPasswordPage**

Same pattern: `className="auth-page"` on outer div, `className="auth-card"` on inner container. Add `autoComplete="email"` to the email input.

- [ ] **Step 4: Update ResetPasswordPage**

Same pattern. Add `autoComplete="new-password"` to password inputs.

- [ ] **Step 5: Verify**

At 375px: login/signup pages show full-screen white layout, no floating card shadow, form fills the viewport width.
iOS Safari: tapping an email or password input does NOT cause the viewport to zoom.
At desktop: pages look identical to before (centered card, max-width 420px).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/LoginPage.jsx frontend/src/pages/SignupPage.jsx \
        frontend/src/pages/ForgotPasswordPage.jsx frontend/src/pages/ResetPasswordPage.jsx
git commit -m "feat(mobile): full-screen auth pages, 16px inputs, autocomplete attributes"
```

---

## Task 11: LandingPage — Responsive Sections

**Files:**
- Modify: `frontend/src/pages/LandingPage.jsx`

- [ ] **Step 1: Update hero section padding and font sizes**

In `frontend/src/pages/LandingPage.jsx`, find the hero `<section>` and update its padding:

```jsx
<section style={{ padding: 'clamp(40px, 8vw, 80px) 24px 60px', textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
```

Find the main headline `<h1>` or equivalent and apply responsive font size:

```jsx
style={{ fontSize: 'clamp(28px, 7vw, 56px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em' }}
```

- [ ] **Step 2: Apply CSS classes to grids**

Find the features grid container (the `div` that maps `FEATURES`) and add the CSS class:

```jsx
<div className="landing-features-grid">
    {FEATURES.map(...)}
</div>
```

Find the sources grid container (maps `SOURCES`):

```jsx
<div className="landing-sources-grid">
    {SOURCES.map(...)}
</div>
```

Find the stats bar container (maps `STATS`):

```jsx
<div className="landing-stats-grid">
    {STATS.map(...)}
</div>
```

These classes are already defined in `index.css` from Task 1. They collapse to 1-col (features), 1-col (sources), and 2×2 (stats) on mobile.

- [ ] **Step 3: Fix header CTA buttons on small screens**

Find the landing page header `<header>`. The two nav buttons ("Sign in" and "Get started") use `padding: '8px 18px'`. Wrap them in a div that shrinks on mobile:

```jsx
<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
    <Link to="/login" style={{
        padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700,
        color: '#111', textDecoration: 'none', border: '1.5px solid #e1e1e1',
        background: '#fff', whiteSpace: 'nowrap',
    }}>
        Sign in
    </Link>
    <Link to="/signup" style={{
        padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700,
        color: '#fff', textDecoration: 'none', background: '#e60023',
        boxShadow: '0 2px 8px rgba(230,0,35,0.3)', whiteSpace: 'nowrap',
    }}>
        Get started
    </Link>
</div>
```

- [ ] **Step 4: Tighten How It Works section spacing on mobile**

Find the HOW_IT_WORKS section steps container. Add `gap: 'clamp(12px, 3vw, 24px)'` to the flex/grid container.

- [ ] **Step 5: Verify**

At 375px:
- Hero headline fits on 2–3 lines, no text overflow
- Features show as single-column cards
- Sources show as single column
- Stats show as 2×2 grid
- Header sign-in and get-started buttons fit side by side

At desktop: page looks identical to before.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/LandingPage.jsx
git commit -m "feat(mobile): responsive landing page — hero, feature/source grids, stats"
```

---

## Final Verification Checklist

After all tasks are complete, test these flows end-to-end at **375px device width** in Chrome DevTools:

- [ ] Landing page → sign up → email verification → login → onboarding modal
- [ ] Discover page: swipe card fills screen, swipe gestures work, card height doesn't overflow
- [ ] Tap a card → full-screen job detail opens → back button closes
- [ ] Apply button → apply modal is full-screen → close works
- [ ] Bottom nav: 5 items, Profile tab navigates correctly
- [ ] Profile page: notification bell and settings gear visible
- [ ] Settings page: sign-out row is comfortably tappable
- [ ] Kanban: horizontal scroll, snap to column, dots update
- [ ] Analytics: 2×2 stat card grid
- [ ] Resume: tap-to-upload triggers file picker
- [ ] Desktop (1280px): visually identical to before for all pages

---

## Rollup Commit (optional — if skipped per-task commits)

```bash
git add -A
git commit -m "feat: mobile-first optimization across all pages

- Full-screen job detail, apply modal, onboarding on mobile
- Clean 5-item bottom nav; notifications + settings in Profile
- Dynamic swipe card height; 44px touch targets throughout
- Kanban horizontal scroll with snap and dot indicators
- Responsive landing page grids and hero
- Auth pages full-screen; 16px inputs prevent iOS zoom
- Safe area insets for iPhone notch/home bar
- Hover effects guarded by @media (hover: hover)"
```
