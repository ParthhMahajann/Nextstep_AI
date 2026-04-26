/**
 * User Profile page — 2026 dark glassmorphism design
 * Includes: profile completion, skill management
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Mail, Phone, Briefcase, GraduationCap,
    Link as LinkIcon, Edit2, Check, X, FileText,
    Github, Linkedin, Globe, Zap, LogOut, MapPin,
    ChevronRight, Plus, Trash2, Search, Settings
} from 'lucide-react';
import { NotificationCenter } from '../components/NotificationCenter';
import { useAuthStore } from '../store/authStore';
import { skillsAPI, profileAPI } from '../api/client';
import { useToast } from '../components/Toast';

const EXP_LEVELS = [
    { value: 'fresher', label: 'Fresher (0 yrs)' },
    { value: 'junior',  label: 'Junior (1–2 yrs)' },
    { value: 'mid',     label: 'Mid Level (3–5 yrs)' },
    { value: 'senior',  label: 'Senior (5+ yrs)' },
];

// ─── Profile Completion Score ─────────────────────────────────────────────────
function ProfileCompletion({ profile, user }) {
    const checks = [
        { label: 'Bio',        done: !!profile?.bio },
        { label: 'Phone',      done: !!profile?.phone },
        { label: 'Experience', done: !!profile?.experience_level },
        { label: 'Skills',     done: (profile?.skills?.length || 0) > 0 },
        { label: 'Resume',     done: !!profile?.resume_text || !!profile?.resume_file },
        { label: 'LinkedIn',   done: !!profile?.linkedin_url },
        { label: 'Portfolio',  done: !!profile?.portfolio_url },
    ];
    const done = checks.filter(c => c.done).length;
    const pct = Math.round((done / checks.length) * 100);
    const color = pct >= 80 ? '#00a86b' : pct >= 50 ? '#d97706' : '#e60023';

    if (pct === 100) return null;

    return (
        <div style={{ background: '#ffffff', border: '1px solid #e1e1e1', borderRadius: 18, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Profile Completion</p>
                <span style={{ fontSize: 22, fontWeight: 900, color }}>{pct}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: '#f0f0f0', overflow: 'hidden', marginBottom: 12 }}>
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    style={{ height: '100%', borderRadius: 99, background: color }}
                />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {checks.map(({ label, done }) => (
                    <span key={label} style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: done ? 'rgba(0,168,107,0.08)' : '#f3f3f3', color: done ? '#00a86b' : 'var(--text-muted)', border: `1px solid ${done ? 'rgba(0,168,107,0.2)' : '#e1e1e1'}` }}>
                        {done ? '✓' : '·'} {label}
                    </span>
                ))}
            </div>
        </div>
    );
}

// ─── Skill Management Panel ───────────────────────────────────────────────────
function SkillsPanel({ profile, onRefresh }) {
    const [allSkills, setAllSkills] = useState([]);
    const [userSkills, setUserSkills] = useState(profile?.skills || []);
    const [query, setQuery] = useState('');
    const [adding, setAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    useEffect(() => {
        skillsAPI.list().then(r => setAllSkills(r.data.results || r.data || [])).catch(() => {});
    }, []);

    useEffect(() => { setUserSkills(profile?.skills || []); }, [profile]);

    const userSkillIds = new Set(userSkills.map(us => us.skill?.id || us.skill));

    const filtered = query.trim()
        ? allSkills.filter(s => s.name.toLowerCase().includes(query.toLowerCase()) && !userSkillIds.has(s.id))
        : [];

    const addSkill = async (skill) => {
        setLoading(true);
        try {
            await skillsAPI.addSkill({ skill: skill.id, proficiency: 'intermediate' });
            await onRefresh();
            toast(`Added ${skill.name}`, 'success');
            setQuery('');
        } catch {
            toast('Failed to add skill', 'error');
        } finally {
            setLoading(false);
        }
    };

    const removeSkill = async (userSkillId, skillName) => {
        try {
            await skillsAPI.removeSkill(userSkillId);
            await onRefresh();
            toast(`Removed ${skillName}`, 'info');
        } catch {
            toast('Failed to remove skill', 'error');
        }
    };

    return (
        <div style={{ background: '#ffffff', border: '1px solid #e1e1e1', borderRadius: 20, padding: 22, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Briefcase size={14} color="#e60023" /> Skills
                    {userSkills.length > 0 && (
                        <span style={{ padding: '1px 8px', borderRadius: 99, fontSize: 11, background: 'rgba(230,0,35,0.08)', color: '#e60023' }}>
                            {userSkills.length}
                        </span>
                    )}
                </h3>
                <button
                    onClick={() => setAdding(v => !v)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 10, border: 'none', background: 'rgba(230,0,35,0.08)', color: '#e60023', fontWeight: 600, fontSize: 12, cursor: 'pointer', outline: '1px solid rgba(230,0,35,0.2)' }}
                >
                    <Plus size={12} /> Add Skill
                </button>
            </div>

            {/* Current skills */}
            {userSkills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: adding ? 16 : 0 }}>
                    {userSkills.map(us => {
                        const name = us.skill?.name || us.skill;
                        return (
                            <motion.span
                                key={us.id}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px 5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: 'rgba(230,0,35,0.06)', color: '#e60023', border: '1px solid rgba(230,0,35,0.15)' }}
                            >
                                {name}
                                <button
                                    onClick={() => removeSkill(us.id, name)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(230,0,35,0.4)', display: 'flex', padding: 0, lineHeight: 0 }}
                                >
                                    <X size={11} />
                                </button>
                            </motion.span>
                        );
                    })}
                </div>
            )}

            {userSkills.length === 0 && !adding && (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No skills added yet.</p>
            )}

            {/* Add skill search */}
            <AnimatePresence>
                {adding && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', background: '#f3f3f3', border: '1px solid #e1e1e1', borderRadius: 12, marginBottom: 8 }}>
                            <Search size={13} color="var(--text-muted)" />
                            <input
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Search skills to add…"
                                autoFocus
                                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 13, padding: '10px 0', width: '100%', minWidth: 0 }}
                            />
                        </div>
                        {filtered.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {filtered.slice(0, 20).map(s => (
                                    <button key={s.id} onClick={() => addSkill(s)} disabled={loading}
                                        style={{ padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #e1e1e1', background: '#f3f3f3', color: 'var(--text-secondary)', transition: 'all 0.15s' }}
                                        onMouseOver={e => { e.currentTarget.style.background = 'rgba(230,0,35,0.08)'; e.currentTarget.style.color = '#e60023'; }}
                                        onMouseOut={e => { e.currentTarget.style.background = '#f3f3f3'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                                    >
                                        + {s.name}
                                    </button>
                                ))}
                            </div>
                        )}
                        {query.trim() && filtered.length === 0 && (
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>No matching skills found.</p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Skill Suggestions Widget ─────────────────────────────────────────────────
function SkillSuggestionsWidget({ onAddSkill }) {
    const [suggestions, setSuggestions] = useState([]);

    useEffect(() => {
        profileAPI.getSkillSuggestions()
            .then(r => setSuggestions(r.data.suggestions || []))
            .catch(() => {});
    }, []);

    if (!suggestions.length) return null;

    return (
        <div style={{ background: '#ffffff', border: '1px solid rgba(230,0,35,0.15)', borderRadius: 18, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#e60023', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={13} color="#e60023" /> Skill Suggestions from your saved jobs
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {suggestions.map(({ skill, message }) => (
                    <div key={skill} title={message} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: 'rgba(230,0,35,0.06)', color: '#e60023', border: '1px solid rgba(230,0,35,0.15)', cursor: 'default' }}>
                        <Plus size={11} /> {skill}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main ProfilePage ─────────────────────────────────────────────────────────
function SectionCard({ children, style }) {
    return (
        <div style={{ background: '#ffffff', border: '1px solid #e1e1e1', borderRadius: 20, padding: 22, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', ...style }}>
            {children}
        </div>
    );
}

function Label({ children }) {
    return (
        <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            {children}
        </p>
    );
}

export function ProfilePage() {
    const { user, profile, updateProfile, fetchUser, logout, isLoading } = useAuthStore();
    const toast = useToast();
    const [editing, setEditing] = useState(false);

    const [form, setForm] = useState({
        bio: profile?.bio || '',
        phone: profile?.phone || '',
        experience_level: profile?.experience_level || '',
        portfolio_url: profile?.portfolio_url || '',
        linkedin_url: profile?.linkedin_url || '',
        github_url: profile?.github_url || '',
        expected_salary: profile?.expected_salary || '',
        open_to_remote: profile?.open_to_remote ?? true,
    });

    const handleSave = async () => {
        const ok = await updateProfile(form);
        if (ok) { toast('Profile updated!', 'success'); setEditing(false); }
        else toast('Failed to update profile', 'error');
    };

    const handleCancel = () => {
        setForm({ bio: profile?.bio || '', phone: profile?.phone || '', experience_level: profile?.experience_level || '', portfolio_url: profile?.portfolio_url || '', linkedin_url: profile?.linkedin_url || '', github_url: profile?.github_url || '', expected_salary: profile?.expected_salary || '', open_to_remote: profile?.open_to_remote ?? true });
        setEditing(false);
    };

    const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'User';
    const initial = displayName[0].toUpperCase();

    return (
        <div className="page" style={{ position: 'relative', zIndex: 1 }}>
            {/* Header */}
            <header style={{ position: 'sticky', top: 0, zIndex: 50, padding: '16px 20px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="logo-mark" style={{ width: 32, height: 32, borderRadius: 10 }}>
                            <Zap size={15} color="#fff" strokeWidth={2.5} />
                        </div>
                        <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Profile</h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {!editing ? (
                            <motion.button onClick={() => setEditing(true)} whileTap={{ scale: 0.95 }}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 12, border: '1px solid rgba(230,0,35,0.2)', background: 'rgba(230,0,35,0.06)', color: '#e60023', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                                <Edit2 size={13} /> Edit
                            </motion.button>
                        ) : (
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={handleCancel} style={{ padding: '8px 12px', borderRadius: 12, border: '1px solid #e1e1e1', background: '#f3f3f3', color: 'var(--text-muted)', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <X size={13} /> Cancel
                                </button>
                                <button onClick={handleSave} disabled={isLoading} style={{ padding: '8px 14px', borderRadius: 12, border: 'none', background: '#e60023', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                                    {isLoading ? '…' : <><Check size={13} /> Save</>}
                                </button>
                            </div>
                        )}
                        <button onClick={logout} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#f87171' }}>
                            <LogOut size={15} />
                        </button>
                    </div>
                </div>
            </header>

            <main style={{ maxWidth: 560, width: '100%', margin: '0 auto', padding: '20px 16px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Profile completion */}
                <ProfileCompletion profile={profile} user={user} />

                {/* Identity card */}
                <SectionCard>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', flexShrink: 0, background: '#e60023', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: '#fff', fontWeight: 800, boxShadow: '0 4px 16px rgba(230,0,35,0.25)' }}>
                            {initial}
                        </div>
                        <div>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{displayName}</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                <Mail size={12} /> {user?.email}
                            </p>
                            {profile?.experience_level_display && (
                                <p style={{ color: '#e60023', fontSize: 12, marginTop: 4, fontWeight: 600 }}>{profile.experience_level_display}</p>
                            )}
                        </div>
                    </div>

                    {/* Bio */}
                    <div style={{ marginBottom: 16 }}>
                        <Label>Bio</Label>
                        {editing ? (
                            <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={3} className="input" style={{ resize: 'none', lineHeight: 1.6 }} placeholder="A brief professional summary…" />
                        ) : (
                            <p style={{ color: profile?.bio ? 'var(--text-secondary)' : 'var(--text-muted)', fontSize: 14, lineHeight: 1.65 }}>
                                {profile?.bio || 'No bio yet — click Edit to add one.'}
                            </p>
                        )}
                    </div>

                    {/* Phone & Exp Level row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div className="profile-field-row">
                            <Label>Phone</Label>
                            {editing ? (
                                <input className="input" placeholder="Phone number" value={form.phone} style={{ fontSize: 14, width: '100%', minWidth: 0 }} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                            ) : (
                                <p style={{ color: profile?.phone ? 'var(--text-secondary)' : 'var(--text-muted)', fontSize: 14 }}>{profile?.phone || '—'}</p>
                            )}
                        </div>
                        <div className="profile-field-row">
                            <Label>Experience Level</Label>
                            {editing ? (
                                <select className="input" style={{ cursor: 'pointer', fontSize: 14 }} value={form.experience_level} onChange={e => setForm(p => ({ ...p, experience_level: e.target.value }))}>
                                    <option value="">Select level</option>
                                    {EXP_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                                </select>
                            ) : (
                                <p style={{ color: profile?.experience_level_display ? 'var(--text-secondary)' : 'var(--text-muted)', fontSize: 14 }}>{profile?.experience_level_display || '—'}</p>
                            )}
                        </div>
                    </div>
                </SectionCard>

                {/* Skills with management */}
                <SkillsPanel profile={profile} onRefresh={fetchUser} />

                {/* AI Skill Suggestions */}
                <SkillSuggestionsWidget />

                {/* Education */}
                {profile?.education && Object.values(profile.education).some(Boolean) && (
                    <SectionCard>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
                            <GraduationCap size={14} color="#e60023" /> Education
                        </h3>
                        <div style={{ fontSize: 14 }}>
                            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {profile.education.degree?.toUpperCase()}{profile.education.field && ` · ${profile.education.field}`}
                            </p>
                            {profile.education.institution && <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{profile.education.institution}</p>}
                            {profile.education.graduation_year && <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Class of {profile.education.graduation_year}</p>}
                        </div>
                    </SectionCard>
                )}

                {/* Links & Preferences */}
                <SectionCard>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
                        <LinkIcon size={14} color="#e60023" /> Links & Preferences
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {editing ? (
                            <>
                                <input className="input" placeholder="Portfolio URL" value={form.portfolio_url} style={{ fontSize: 14 }} onChange={e => setForm(p => ({ ...p, portfolio_url: e.target.value }))} />
                                <input className="input" placeholder="LinkedIn URL" value={form.linkedin_url} style={{ fontSize: 14 }} onChange={e => setForm(p => ({ ...p, linkedin_url: e.target.value }))} />
                                <input className="input" placeholder="GitHub URL" value={form.github_url} style={{ fontSize: 14 }} onChange={e => setForm(p => ({ ...p, github_url: e.target.value }))} />
                                <input className="input" placeholder="Expected salary (e.g. ₹8–12 LPA)" value={form.expected_salary} style={{ fontSize: 14 }} onChange={e => setForm(p => ({ ...p, expected_salary: e.target.value }))} />
                                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                                    <div onClick={() => setForm(p => ({ ...p, open_to_remote: !p.open_to_remote }))}
                                        style={{ width: 44, height: 24, borderRadius: 12, background: form.open_to_remote ? '#e60023' : '#e1e1e1', position: 'relative', transition: 'background 0.25s', cursor: 'pointer', flexShrink: 0 }}>
                                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: form.open_to_remote ? 23 : 3, transition: 'left 0.25s' }} />
                                    </div>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Open to remote work</span>
                                </label>
                            </>
                        ) : (
                            <>
                                {profile?.portfolio_url && <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#e60023', fontSize: 14, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Globe size={14} /> {profile.portfolio_url}</a>}
                                {profile?.linkedin_url && <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1877f2', fontSize: 14, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Linkedin size={14} /> {profile.linkedin_url}</a>}
                                {profile?.github_url && <a href={profile.github_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 14, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Github size={14} /> {profile.github_url}</a>}
                                {profile?.expected_salary && <p style={{ fontSize: 14, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}><Briefcase size={14} color="var(--text-muted)" /> {profile.expected_salary}</p>}
                                <p style={{ fontSize: 14, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}><MapPin size={14} /> {profile?.open_to_remote ? 'Open to remote' : 'On-site preferred'}</p>
                                {!profile?.portfolio_url && !profile?.linkedin_url && !profile?.github_url && (
                                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No links added — click Edit to add.</p>
                                )}
                            </>
                        )}
                    </div>
                </SectionCard>

                {/* Resume shortcut */}
                <SectionCard>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileText size={14} color="#e60023" />
                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Resume & AI Tools</span>
                        </div>
                        <Link to="/resume-analyzer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'rgba(230,0,35,0.06)', border: '1px solid rgba(230,0,35,0.15)', color: '#e60023', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                            Open <ChevronRight size={13} />
                        </Link>
                    </div>
                </SectionCard>
            </main>
        </div>
    );
}
