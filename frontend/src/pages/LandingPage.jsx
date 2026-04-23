/**
 * Public landing page — hero, sources, features, how-it-works, CTA
 */

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Zap, Compass, ScanText, LayoutGrid, BarChart3, Bookmark,
    Sparkles, Globe, Code2, Briefcase, MapPin, TrendingUp,
    CheckCircle2, ArrowRight, Star, Users, Target, Brain,
    Building2, Layers, MessageSquare, ChevronRight, Coffee,
    Cpu, DollarSign, Rocket, Shield, Clock
} from 'lucide-react';

const SOURCES = [
    {
        name: 'Arbeitnow',
        icon: Globe,
        color: '#0a66c2',
        bg: 'rgba(10,102,194,0.08)',
        desc: 'EU & international jobs — tech, remote, visa sponsorship',
        count: '40 K+ listings',
    },
    {
        name: 'JSearch / Google Jobs',
        icon: Layers,
        color: '#e60023',
        bg: 'rgba(230,0,35,0.08)',
        desc: 'Google-powered aggregator across all major job boards',
        count: '2 M+ daily',
    },
    {
        name: 'Reddit r/forhire',
        icon: Users,
        color: '#ff4500',
        bg: 'rgba(255,69,0,0.08)',
        desc: 'Freelance, contract & remote roles posted by real humans',
        count: 'Live feed',
    },
    {
        name: 'LinkedIn Jobs',
        icon: Briefcase,
        color: '#0a66c2',
        bg: 'rgba(10,102,194,0.08)',
        desc: 'Professional network — full-time, part-time & internships',
        count: 'Top picks',
    },
];

const JOB_TYPES = [
    { label: 'Full-time',    icon: Briefcase,    color: '#e60023' },
    { label: 'Remote',       icon: Globe,         color: '#0a66c2' },
    { label: 'Part-time',    icon: Clock,         color: '#d97706' },
    { label: 'Contract',     icon: Shield,        color: '#7c3aed' },
    { label: 'Freelance',    icon: Coffee,        color: '#00a86b' },
    { label: 'Internship',   icon: Star,          color: '#e60023' },
    { label: 'Entry Level',  icon: Rocket,        color: '#0a66c2' },
    { label: 'Senior',       icon: TrendingUp,    color: '#d97706' },
    { label: 'AI / ML',      icon: Brain,         color: '#7c3aed' },
    { label: 'Engineering',  icon: Cpu,           color: '#00a86b' },
    { label: 'Design',       icon: Sparkles,      color: '#e60023' },
    { label: 'Finance',      icon: DollarSign,    color: '#0a66c2' },
];

const FEATURES = [
    {
        icon: Compass,
        color: '#e60023',
        bg: 'rgba(230,0,35,0.08)',
        title: 'Swipe to Discover',
        desc: 'Tinder-style job swiping. Skip in 0.3 s, apply in 3 taps. Your dashboard, not your inbox.',
    },
    {
        icon: Brain,
        color: '#7c3aed',
        bg: 'rgba(124,58,237,0.08)',
        title: 'AI Match Score',
        desc: 'Sentence-transformer ML ranks every job against your skills, preferences and past likes in real time.',
    },
    {
        icon: ScanText,
        color: '#0a66c2',
        bg: 'rgba(10,102,194,0.08)',
        title: 'Resume Analyser',
        desc: 'ATS score, keyword gaps, strength breakdown and AI-generated tailored cover letters — all in one screen.',
    },
    {
        icon: LayoutGrid,
        color: '#00a86b',
        bg: 'rgba(0,168,107,0.08)',
        title: 'Kanban Tracker',
        desc: 'Drag applications through Saved → Preparing → Applied → Interviewing → Accepted. Never lose track.',
    },
    {
        icon: BarChart3,
        color: '#d97706',
        bg: 'rgba(217,119,6,0.08)',
        title: 'Analytics Dashboard',
        desc: 'Response rates, offer rates, pipeline funnel, top skills and upcoming interview calendar.',
    },
    {
        icon: MessageSquare,
        color: '#e60023',
        bg: 'rgba(230,0,35,0.08)',
        title: 'AI Chat Widget',
        desc: 'Ask anything — "write a cold email to the recruiter", "what skills am I missing?", "prep me for tomorrow".',
    },
];

const HOW_IT_WORKS = [
    { step: '01', title: 'Create your profile',       desc: 'Add your skills, experience level, location and job preferences in 3 minutes.' },
    { step: '02', title: 'Upload your resume',         desc: 'Our AI scores it, finds gaps, and auto-fills match context for every job.' },
    { step: '03', title: 'Swipe through curated jobs', desc: 'ML-ranked jobs from 4 live sources appear in your personalised feed.' },
    { step: '04', title: 'Track & get hired',          desc: 'Move cards through your Kanban board and land the offer.' },
];

const STATS = [
    { value: '2M+',   label: 'Jobs indexed daily' },
    { value: '4',     label: 'Live data sources'  },
    { value: '< 3 s', label: 'AI match time'      },
    { value: '∞',     label: 'Free forever'        },
];

function FadeUp({ children, delay = 0, style = {} }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
            style={style}
        >
            {children}
        </motion.div>
    );
}

export function LandingPage() {
    return (
        <div style={{ minHeight: '100dvh', background: '#ffffff', overflowX: 'hidden' }}>

            {/* ── Top Bar ── */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 100,
                background: 'rgba(255,255,255,0.97)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid #e1e1e1',
                padding: '0 24px',
                height: 60,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="logo-mark" style={{ width: 34, height: 34, borderRadius: 9 }}>
                        <Zap size={15} color="#fff" strokeWidth={2.5} />
                    </div>
                    <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: '#111' }}>
                        Next<span style={{ color: '#e60023' }}>Step</span>
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Link to="/login" style={{
                        padding: '8px 18px', borderRadius: 999, fontSize: 13, fontWeight: 700,
                        color: '#111', textDecoration: 'none', border: '1.5px solid #e1e1e1',
                        background: '#fff',
                    }}>
                        Sign in
                    </Link>
                    <Link to="/signup" style={{
                        padding: '8px 18px', borderRadius: 999, fontSize: 13, fontWeight: 700,
                        color: '#fff', textDecoration: 'none', background: '#e60023',
                        boxShadow: '0 2px 8px rgba(230,0,35,0.3)',
                    }}>
                        Get started
                    </Link>
                </div>
            </header>

            {/* ── Hero ── */}
            <section style={{ padding: '80px 24px 60px', textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
                <FadeUp>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '5px 14px', borderRadius: 999,
                        background: 'rgba(230,0,35,0.07)', border: '1px solid rgba(230,0,35,0.18)',
                        fontSize: 12, fontWeight: 700, color: '#e60023', marginBottom: 28,
                        letterSpacing: '0.04em',
                    }}>
                        <Sparkles size={12} />
                        AI-POWERED JOB DISCOVERY
                    </div>
                </FadeUp>

                <FadeUp delay={0.05}>
                    <h1 style={{
                        fontSize: 'clamp(40px, 7vw, 72px)',
                        fontWeight: 900,
                        letterSpacing: '-0.04em',
                        lineHeight: 1.05,
                        color: '#111',
                        marginBottom: 24,
                    }}>
                        Find your next job<br />
                        <span style={{ color: '#e60023' }}>in seconds, not weeks.</span>
                    </h1>
                </FadeUp>

                <FadeUp delay={0.1}>
                    <p style={{
                        fontSize: 18, color: '#4a4a4a', lineHeight: 1.7,
                        maxWidth: 560, margin: '0 auto 40px',
                    }}>
                        Swipe through ML-ranked jobs from 4 live sources. AI analyses your resume,
                        tracks applications and coaches you — all in one place.
                    </p>
                </FadeUp>

                <FadeUp delay={0.15}>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/signup" style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '14px 28px', borderRadius: 999, fontSize: 15, fontWeight: 700,
                            color: '#fff', textDecoration: 'none', background: '#e60023',
                            boxShadow: '0 4px 18px rgba(230,0,35,0.35)',
                        }}>
                            Start for free <ArrowRight size={16} />
                        </Link>
                        <Link to="/login" style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '14px 28px', borderRadius: 999, fontSize: 15, fontWeight: 700,
                            color: '#111', textDecoration: 'none',
                            border: '1.5px solid #e1e1e1', background: '#fff',
                        }}>
                            Sign in
                        </Link>
                    </div>
                </FadeUp>

                {/* Stats row */}
                <FadeUp delay={0.2}>
                    <div style={{
                        display: 'flex', gap: 0, justifyContent: 'center',
                        marginTop: 56, flexWrap: 'wrap',
                        borderTop: '1px solid #f0f0f0', paddingTop: 36,
                    }}>
                        {STATS.map(({ value, label }, i) => (
                            <div key={label} style={{
                                flex: '1 1 120px', textAlign: 'center', padding: '0 24px',
                                borderRight: i < STATS.length - 1 ? '1px solid #f0f0f0' : 'none',
                            }}>
                                <p style={{ fontSize: 30, fontWeight: 900, color: '#e60023', letterSpacing: '-0.03em' }}>{value}</p>
                                <p style={{ fontSize: 12, color: '#767676', marginTop: 4, fontWeight: 600 }}>{label}</p>
                            </div>
                        ))}
                    </div>
                </FadeUp>
            </section>

            {/* ── Sources ── */}
            <section style={{ background: '#f9f9f9', padding: '64px 24px', borderTop: '1px solid #e1e1e1', borderBottom: '1px solid #e1e1e1' }}>
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                    <FadeUp>
                        <div style={{ textAlign: 'center', marginBottom: 40 }}>
                            <p style={{ fontSize: 12, fontWeight: 800, color: '#e60023', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Live Data Sources</p>
                            <h2 style={{ fontSize: 32, fontWeight: 900, color: '#111', letterSpacing: '-0.03em' }}>Jobs from everywhere,<br />ranked for you</h2>
                        </div>
                    </FadeUp>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                        {SOURCES.map(({ name, icon: Icon, color, bg, desc, count }, i) => (
                            <FadeUp key={name} delay={i * 0.07}>
                                <div style={{
                                    background: '#fff', border: '1px solid #e1e1e1',
                                    borderRadius: 20, padding: '22px 20px',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                                    height: '100%',
                                }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 12,
                                        background: bg, display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', marginBottom: 14,
                                    }}>
                                        <Icon size={20} color={color} />
                                    </div>
                                    <p style={{ fontWeight: 800, fontSize: 14, color: '#111', marginBottom: 6 }}>{name}</p>
                                    <p style={{ fontSize: 12, color: '#767676', lineHeight: 1.5, marginBottom: 12 }}>{desc}</p>
                                    <span style={{
                                        display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                                        fontSize: 11, fontWeight: 700, background: bg, color,
                                        border: `1px solid ${color}22`,
                                    }}>{count}</span>
                                </div>
                            </FadeUp>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Job Types ── */}
            <section style={{ padding: '64px 24px' }}>
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                    <FadeUp>
                        <div style={{ textAlign: 'center', marginBottom: 40 }}>
                            <p style={{ fontSize: 12, fontWeight: 800, color: '#e60023', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>What we track</p>
                            <h2 style={{ fontSize: 32, fontWeight: 900, color: '#111', letterSpacing: '-0.03em' }}>Every type of opportunity</h2>
                        </div>
                    </FadeUp>

                    <FadeUp delay={0.05}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                            {JOB_TYPES.map(({ label, icon: Icon, color }) => (
                                <div key={label} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 7,
                                    padding: '9px 16px', borderRadius: 999,
                                    background: `${color}0d`, border: `1.5px solid ${color}22`,
                                    fontSize: 13, fontWeight: 700, color,
                                }}>
                                    <Icon size={14} />
                                    {label}
                                </div>
                            ))}
                        </div>
                    </FadeUp>
                </div>
            </section>

            {/* ── Features ── */}
            <section style={{ background: '#f9f9f9', padding: '64px 24px', borderTop: '1px solid #e1e1e1', borderBottom: '1px solid #e1e1e1' }}>
                <div style={{ maxWidth: 960, margin: '0 auto' }}>
                    <FadeUp>
                        <div style={{ textAlign: 'center', marginBottom: 48 }}>
                            <p style={{ fontSize: 12, fontWeight: 800, color: '#e60023', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Everything you need</p>
                            <h2 style={{ fontSize: 32, fontWeight: 900, color: '#111', letterSpacing: '-0.03em' }}>Your entire job search,<br />in one app</h2>
                        </div>
                    </FadeUp>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
                        {FEATURES.map(({ icon: Icon, color, bg, title, desc }, i) => (
                            <FadeUp key={title} delay={i * 0.06}>
                                <div style={{
                                    background: '#fff', border: '1px solid #e1e1e1',
                                    borderRadius: 20, padding: '24px 22px',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                                }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 12,
                                        background: bg, display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', marginBottom: 16,
                                    }}>
                                        <Icon size={20} color={color} />
                                    </div>
                                    <p style={{ fontWeight: 800, fontSize: 15, color: '#111', marginBottom: 8 }}>{title}</p>
                                    <p style={{ fontSize: 13, color: '#767676', lineHeight: 1.6 }}>{desc}</p>
                                </div>
                            </FadeUp>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How it works ── */}
            <section style={{ padding: '64px 24px' }}>
                <div style={{ maxWidth: 800, margin: '0 auto' }}>
                    <FadeUp>
                        <div style={{ textAlign: 'center', marginBottom: 48 }}>
                            <p style={{ fontSize: 12, fontWeight: 800, color: '#e60023', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>How it works</p>
                            <h2 style={{ fontSize: 32, fontWeight: 900, color: '#111', letterSpacing: '-0.03em' }}>From signup to offer in 4 steps</h2>
                        </div>
                    </FadeUp>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {HOW_IT_WORKS.map(({ step, title, desc }, i) => (
                            <FadeUp key={step} delay={i * 0.08}>
                                <div style={{
                                    display: 'flex', gap: 24, alignItems: 'flex-start',
                                    padding: '24px 0',
                                    borderBottom: i < HOW_IT_WORKS.length - 1 ? '1px solid #f0f0f0' : 'none',
                                }}>
                                    <div style={{
                                        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                                        background: i === 0 ? '#e60023' : '#f3f3f3',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 14, fontWeight: 900,
                                        color: i === 0 ? '#fff' : '#767676',
                                        border: i === 0 ? 'none' : '1.5px solid #e1e1e1',
                                    }}>{step}</div>
                                    <div>
                                        <p style={{ fontWeight: 800, fontSize: 16, color: '#111', marginBottom: 6 }}>{title}</p>
                                        <p style={{ fontSize: 14, color: '#767676', lineHeight: 1.6 }}>{desc}</p>
                                    </div>
                                </div>
                            </FadeUp>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA Banner ── */}
            <section style={{ padding: '60px 24px', background: '#e60023' }}>
                <FadeUp>
                    <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                            <Zap size={22} color="#fff" strokeWidth={2.5} />
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', opacity: 0.9, letterSpacing: '0.04em' }}>FREE · NO CREDIT CARD · INSTANT ACCESS</span>
                        </div>
                        <h2 style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: 16 }}>
                            Ready to land your next role?
                        </h2>
                        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', marginBottom: 32, lineHeight: 1.6 }}>
                            Join thousands of job seekers who are swiping smarter, applying faster, and getting more interviews.
                        </p>
                        <Link to="/signup" style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '14px 32px', borderRadius: 999, fontSize: 15, fontWeight: 800,
                            color: '#e60023', textDecoration: 'none',
                            background: '#ffffff', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        }}>
                            Get started free <ArrowRight size={16} />
                        </Link>
                    </div>
                </FadeUp>
            </section>

            {/* ── Footer ── */}
            <footer style={{
                padding: '24px', textAlign: 'center',
                borderTop: '1px solid #e1e1e1', background: '#fff',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                    <div className="logo-mark" style={{ width: 24, height: 24, borderRadius: 6 }}>
                        <Zap size={11} color="#fff" strokeWidth={2.5} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>
                        Next<span style={{ color: '#e60023' }}>Step</span> AI
                    </span>
                </div>
                <p style={{ fontSize: 12, color: '#767676' }}>
                    Built to get you hired faster. &copy; {new Date().getFullYear()}
                </p>
            </footer>
        </div>
    );
}
