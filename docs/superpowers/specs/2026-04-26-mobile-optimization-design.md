# Mobile Optimization Design — NextStep AI

**Date:** 2026-04-26
**Scope:** Full mobile audit — every page feels like a native mobile app
**Constraint:** Desktop layouts (sidebar, wide content) remain completely untouched
**Approach:** Mobile-first component refactor (Approach B)

---

## 1. Navigation & Global Shell

### Bottom Nav Restructure
Replace the current 6-slot bottom nav (5 items + cramped "More" slot with two icons) with a clean 5-item nav:

| Slot | Route | Icon |
|------|-------|------|
| Discover | `/discover` | Compass |
| Saved | `/saved` | Bookmark |
| Tracker | `/tracker` | LayoutGrid |
| Resume | `/resume-analyzer` | ScanText |
| Profile | `/profile` | User circle |

- Settings and Notifications move to the Profile page — no longer in the bottom nav
- Each nav item gets a minimum touch target of 44×44px
- Active state uses red background pill (existing style, preserved)

### Safe Area Insets
- Bottom nav: `padding-bottom: max(12px, env(safe-area-inset-bottom))` — clears iPhone home indicator
- `.page` bottom padding: `calc(80px + env(safe-area-inset-bottom))`
- Sticky headers: `padding-top: env(safe-area-inset-top)` where needed

### Touch & Interaction Fixes (index.css)
- All hover transforms (`translateY(-1px)`, scale effects) wrapped in `@media (hover: hover)` — prevents stuck hover states on touch devices
- Add `:active` scale feedback (`scale(0.97)`) on all buttons for tactile press response
- `overscroll-behavior-y: contain` on modal/sheet scroll containers
- Input `font-size` raised to `16px` on mobile (prevents iOS auto-zoom; currently 15px triggers it)
- Button icon targets raised from 36px → 44px on `@media (max-width: 767px)`

### index.html
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#ffffff">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
```

---

## 2. Job Detail — Full-Screen on Mobile

**Current:** 90vh bottom sheet (content gets cut off on small phones)
**Proposed:** Full-screen takeover on mobile (`≤ 767px`), 90vh sheet on desktop (`≥ 768px`)

### Mobile behavior
- `position: fixed; inset: 0` — fills entire viewport
- No backdrop overlay (it IS the screen)
- Slide-in animation: `y: '100%' → 0` (same direction, just goes full height)
- Back button (`←` arrow, 44px touch target) replaces the `✕` close button — placed top-left in a sticky header bar
- Sticky header shows job title + company (truncated)
- Content area scrolls independently between sticky header and sticky footer
- Sticky footer CTA: Save + Apply Now, full-width, `padding-bottom: env(safe-area-inset-bottom)`

### Desktop behavior
- Unchanged: 90vh bottom sheet, backdrop, `✕` button, spring animation

### Implementation
- Create a `useIsMobile()` hook using `window.matchMedia('(max-width: 767px)')` with a `matchMedia.addEventListener('change', ...)` listener — reusable across all components in this spec
- `JobDetailSheet` reads `isMobile` to select Framer Motion animation variant (`inset: 0` vs `bottom: 0`)
- `onClose` prop unchanged — parent components require no changes
- No new routes needed — stays as an overlay component

---

## 3. Page-by-Page Changes

### Landing Page (`LandingPage.jsx`)
- **Header:** Shrink CTA buttons on `≤ 480px` (`padding: 7px 14px`, `font-size: 12px`)
- **Hero:** Top padding `80px → 48px` on mobile; headline font-size responsive (`clamp(28px, 8vw, 52px)`)
- **Job type pill grid:** `grid-template-columns: repeat(3, 1fr)` on mobile (currently implied wider)
- **Features grid:** `repeat(3, 1fr)` → `1fr` on mobile (single column stacked cards)
- **Sources grid:** `repeat(2, 1fr)` → `1fr` on mobile
- **Stats bar:** `repeat(4, 1fr)` → `repeat(2, 1fr)` on mobile
- **How It Works steps:** Already vertical — tighten step gap and padding
- **Footer CTA:** Full-width button, reduce section vertical padding

### Discover Page (`DiscoverPage.jsx` + `SwipeCard.jsx`)
- **Card height:** `CardStack` container changes from fixed `height: 500` to `height: min(500px, calc(100dvh - 260px))` — fits iPhone SE (667px height) without overflowing
- **Swipe hints:** Replace text hints (`← skip ↑ save → apply`) with icon-based pills for readability on small screens
- **Header icon buttons:** 36px → 44px on mobile

### Kanban Tracker (`KanbanPage.jsx`)
- **Layout:** On mobile, columns become a horizontally scrollable strip with `scroll-snap-type: x mandatory` and `scroll-snap-align: start` on each column
- **Column width:** Each column `min-width: 260px` so one fits comfortably in viewport
- **Scroll indicator:** Add dot indicators below the board showing current column position
- **Bulk action toolbar:** Full-width sticky bottom bar on mobile (currently floats)
- **Card move action:** Uses existing tap-menu "Move to…" — no change needed, works well for touch

### Analytics Page (`AnalyticsPage.jsx`)
- **Stat cards:** `grid-template-columns: repeat(2, 1fr)` stays on `≥ 360px`; collapses to `1fr` on `< 360px`
- **Funnel bars:** Already single-column — add `padding: 0 16px`
- **Top skills / recent activity:** Full-width, tighten card padding to `12px`

### Saved Jobs Page (`SavedJobsPage.jsx`)
- Cards are already single-column — increase card tap area, ensure `padding: 14px 16px`
- Filter/sort controls: full-width row on mobile

### Profile Page (`ProfilePage.jsx`)
- Form section labels above fields (not inline) on mobile
- Skill tags input: full-width on mobile
- Avatar upload: larger tap target

### Settings Page (`SettingsPage.jsx`)
- Add **Notifications** section (moved from bottom nav)
- Add prominent **Sign Out** button (moved from bottom nav's "More" slot)
- All toggle rows: min-height 52px for comfortable touch

### Resume Analyzer Page (`ResumeAnalyzerPage.jsx`)
- Drop-zone → tap-to-upload on mobile (hide drag-and-drop instructions, show "Tap to upload")
- `<input type="file" accept=".pdf,.doc,.docx">` triggers native file picker
- Analysis results: stacked single-column layout

### Auth Pages (Login, Signup, Forgot/Reset Password)
- Currently floating centered card — go full-screen on mobile: remove card shadow/border, fill viewport
- All `<input>` elements: `font-size: 16px` on mobile
- CTA buttons: `width: 100%`
- Add `autocomplete` attributes: `email`, `current-password`, `new-password`

### Modals (ApplyModal, OnboardingModal)
- **ApplyModal:** Centered dialog → full-screen on mobile (same pattern as JobDetailSheet)
- **OnboardingModal:** Wizard steps go full-screen on mobile; each step must fit without internal scrolling — reduce content density if needed

---

## 4. Files Modified

| File | Change type |
|------|-------------|
| `index.html` | viewport meta, theme-color, PWA tags |
| `frontend/src/index.css` | safe area insets, hover→active, touch targets, input font-size |
| `frontend/src/components/NavBar.jsx` | 5-item nav, remove `NotificationCenter` + Settings link |
| `frontend/src/pages/ProfilePage.jsx` (notifications) | Move `NotificationCenter` component here; add Settings link |
| `frontend/src/App.jsx` | pass `isMobile` context if needed |
| `frontend/src/components/JobDetailSheet.jsx` | full-screen variant on mobile |
| `frontend/src/components/SwipeCard.jsx` | dynamic card height |
| `frontend/src/components/ApplyModal.jsx` | full-screen on mobile |
| `frontend/src/components/OnboardingModal.jsx` | full-screen on mobile |
| `frontend/src/pages/DiscoverPage.jsx` | card height, header touch targets, swipe hints |
| `frontend/src/pages/KanbanPage.jsx` | horizontal scroll + snap, indicator dots |
| `frontend/src/pages/AnalyticsPage.jsx` | stat card grid, padding |
| `frontend/src/pages/SavedJobsPage.jsx` | card padding, tap area |
| `frontend/src/pages/ProfilePage.jsx` | form layout, label position |
| `frontend/src/pages/SettingsPage.jsx` | add notifications + sign-out |
| `frontend/src/pages/ResumeAnalyzerPage.jsx` | tap-to-upload, stacked results |
| `frontend/src/pages/LandingPage.jsx` | responsive grids, hero padding, button sizes |
| `frontend/src/pages/LoginPage.jsx` | full-screen, font-size, autocomplete |
| `frontend/src/pages/SignupPage.jsx` | full-screen, font-size, autocomplete |
| `frontend/src/pages/ForgotPasswordPage.jsx` | full-screen, font-size |
| `frontend/src/pages/ResetPasswordPage.jsx` | full-screen, font-size |

**Total: 20 files**

---

## 5. What Does NOT Change

- All desktop layouts — sidebar, wide content, desktop modals
- Backend, API, Zustand stores, routing logic
- Design language: Pinterest red (#e60023), Inter font, card border-radius, shadow system
- Animation library (Framer Motion) — only variants change for mobile
- Any server-side code

---

## 6. Success Criteria

- Every page is usable on a 375px-wide screen (iPhone SE/12 mini) without horizontal overflow
- No content hidden behind the iPhone home indicator or notch
- All interactive elements have ≥ 44×44px touch targets
- iOS does not auto-zoom on any input focus
- Job detail opens full-screen on mobile and returns cleanly on back
- Kanban columns scroll horizontally with snap and indicator dots
- Desktop experience is pixel-identical to before
