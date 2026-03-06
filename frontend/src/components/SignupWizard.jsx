/**
 * Premium 7-step Signup Wizard — NextStep AI
 */

import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, GraduationCap, Award, Lightbulb,
    Briefcase, Settings, FileText,
    ChevronRight, ChevronLeft, Check,
    Eye, EyeOff, Upload, X, Plus
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { profileAPI } from '../api/client';

// ── Step definitions ─────────────────────────────────────
const STEPS = [
    { id: 1, title: 'Basic Info', icon: User },
    { id: 2, title: 'Education', icon: GraduationCap },
    { id: 3, title: 'Qualifications', icon: Award },
    { id: 4, title: 'Skills', icon: Lightbulb },
    { id: 5, title: 'Experience', icon: Briefcase },
    { id: 6, title: 'Preferences', icon: Settings },
    { id: 7, title: 'Resume', icon: FileText },
];

const JOB_TYPES = ['Internship', 'Full-time', 'Part-time', 'Freelance', 'Contract'];
const LOCATIONS = ['Remote', 'Mumbai', 'Bangalore', 'Delhi', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata', 'Noida', 'Gurgaon'];
const SKILL_OPTIONS = [
    'JavaScript', 'Python', 'React', 'Node.js', 'Java', 'C++', 'C#', 'Go', 'Rust',
    'Machine Learning', 'Deep Learning', 'Data Science', 'NLP',
    'UI/UX Design', 'Figma', 'Photoshop',
    'SQL', 'MongoDB', 'PostgreSQL', 'Redis',
    'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform',
    'Git', 'TypeScript', 'Flutter', 'React Native',
    'Django', 'FastAPI', 'Flask', 'Spring Boot',
    'Blockchain', 'Solidity', 'Cybersecurity',
];
const EXP_LEVELS = [
    { value: 'fresher', label: 'Fresher (0 yrs)' },
    { value: 'junior', label: 'Junior (1–2 yrs)' },
    { value: 'mid', label: 'Mid Level (3–5 yrs)' },
    { value: 'senior', label: 'Senior (5+ yrs)' },
];
const DEGREE_OPTIONS = [
    { value: 'btech', label: 'B.Tech / B.E.' },
    { value: 'bsc', label: 'B.Sc' },
    { value: 'bca', label: 'BCA' },
    { value: 'bcom', label: 'B.Com' },
    { value: 'ba', label: 'B.A.' },
    { value: 'mtech', label: 'M.Tech / M.E.' },
    { value: 'msc', label: 'M.Sc' },
    { value: 'mca', label: 'MCA' },
    { value: 'mba', label: 'MBA' },
    { value: 'phd', label: 'Ph.D.' },
    { value: 'diploma', label: 'Diploma' },
    { value: 'other', label: 'Other' },
];

// ── helpers ──────────────────────────────────────────────
function Tag({ label, active, onClick, disabled }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            style={{
                padding: '8px 16px',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: disabled ? 'not-allowed' : 'pointer',
                border: 'none',
                transition: 'all 0.15s ease',
                background: active
                    ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                    : 'rgba(51,65,85,0.6)',
                color: active ? '#fff' : '#94a3b8',
                opacity: disabled && !active ? 0.35 : 1,
            }}
        >
            {label}
        </button>
    );
}

function FieldLabel({ children }) {
    return (
        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '10px', fontWeight: 500 }}>
            {children}
        </p>
    );
}

// ── Main component ────────────────────────────────────────
export function SignupWizard() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [showPw, setShowPw] = useState(false);
    const [showPwC, setShowPwC] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const resumeInputRef = useRef(null);

    // qualification draft state
    const [qualDraft, setQualDraft] = useState({ title: '', issuer: '', year: '' });

    const [form, setForm] = useState({
        // Step 1
        firstName: '', lastName: '', age: '', phone: '', email: '',
        password: '', passwordConfirm: '',
        // Step 2
        degree: '', field: '', institution: '', graduationYear: '', gpa: '', status: 'student',
        // Step 3
        qualifications: [],
        // Step 4
        skills: [],
        // Step 5
        bio: '', experienceLevel: '', portfolioUrl: '', linkedinUrl: '', githubUrl: '',
        // Step 6
        preferredJobTypes: [], preferredLocations: [], openToRemote: true, expectedSalary: '',
        // Step 7
        resumeText: '', resumeFile: null,
    });

    const { register } = useAuthStore();

    const set_ = (field, value) => setForm(p => ({ ...p, [field]: value }));
    const toggle = (field, item) =>
        setForm(p => ({
            ...p,
            [field]: p[field].includes(item)
                ? p[field].filter(i => i !== item)
                : [...p[field], item],
        }));

    // ── Validation per step ───────────────────────────────
    const validate = () => {
        if (step === 1) {
            if (!form.firstName.trim()) return 'First name is required.';
            if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
                return 'Valid email is required.';
            if (form.password.length < 8) return 'Password must be at least 8 characters.';
            if (form.password !== form.passwordConfirm) return 'Passwords do not match.';
            if (form.age && (isNaN(form.age) || form.age < 14 || form.age > 100))
                return 'Please enter a valid age (14–100).';
        }
        if (step === 2) {
            if (!form.degree) return 'Please select your degree.';
        }
        return null;
    };

    const handleNext = () => {
        const err = validate();
        if (err) { setError(err); return; }
        setError(null);
        if (step < 7) setStep(s => s + 1);
    };

    const handleBack = () => { setError(null); setStep(s => s - 1); };

    // ── Add qualification ──────────────────────────────────
    const addQual = () => {
        if (!qualDraft.title.trim()) return;
        setForm(p => ({ ...p, qualifications: [...p.qualifications, { ...qualDraft }] }));
        setQualDraft({ title: '', issuer: '', year: '' });
    };
    const removeQual = (i) =>
        setForm(p => ({ ...p, qualifications: p.qualifications.filter((_, idx) => idx !== i) }));

    // ── Submit ────────────────────────────────────────────
    const handleSubmit = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // 1. Register (user created as inactive pending email verification)
            const ok = await register({
                firstName: form.firstName,
                lastName: form.lastName,
                email: form.email,
                password: form.password,
            });
            if (!ok) {
                setIsLoading(false);
                return;
            }

            // 2. Store profile data in sessionStorage so it can be
            //    applied after the user verifies their email and logs in.
            //    (Profile PATCH requires auth token; user is inactive until verified.)
            const profilePayload = {
                age: form.age || null,
                phone: form.phone,
                bio: form.bio,
                experience_level: form.experienceLevel,
                education: {
                    degree: form.degree,
                    field: form.field,
                    institution: form.institution,
                    graduation_year: form.graduationYear,
                    gpa: form.gpa,
                    status: form.status,
                },
                qualifications: form.qualifications,
                portfolio_url: form.portfolioUrl,
                linkedin_url: form.linkedinUrl,
                github_url: form.githubUrl,
                preferred_job_types: form.preferredJobTypes,
                preferred_locations: form.preferredLocations,
                open_to_remote: form.openToRemote,
                expected_salary: form.expectedSalary,
                resume_text: form.resumeText,
            };
            sessionStorage.setItem('pending_profile', JSON.stringify(profilePayload));
            if (form.resumeFile) {
                // Store file name as a hint; actual upload happens after login
                sessionStorage.setItem('pending_resume_filename', form.resumeFile.name);
            }

            navigate('/verify-email-sent');
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Input styling ─────────────────────────────────────
    const inputStyle = {
        width: '100%',
        padding: '13px 16px',
        background: 'rgba(15,23,42,0.6)',
        border: '2px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        color: 'white',
        fontSize: '15px',
        outline: 'none',
        transition: 'border-color 0.2s',
    };
    const selectStyle = { ...inputStyle, cursor: 'pointer' };
    const textareaStyle = { ...inputStyle, resize: 'none', minHeight: '110px' };

    return (
        <div className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
            <div style={{ width: '100%', maxWidth: '600px' }}>

                {/* ── Header ── */}
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '8px'
                    }}>
                        <div className="gradient-primary" style={{
                            width: 40, height: 40, borderRadius: 12,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Briefcase size={20} color="#fff" />
                        </div>
                        <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>NextStep AI</span>
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                        Step {step} of {STEPS.length} — {STEPS[step - 1].title}
                    </p>
                </div>

                {/* ── Step progress ── */}
                <div style={{ marginBottom: '28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        {STEPS.map((s) => {
                            const Icon = s.icon;
                            const done = s.id < step;
                            const active = s.id === step;
                            return (
                                <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <div style={{
                                        width: 38, height: 38, borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: done ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                                            : active ? 'rgba(99,102,241,0.2)' : 'rgba(51,65,85,0.5)',
                                        border: active ? '2px solid #6366f1' : '2px solid transparent',
                                        transition: 'all 0.3s',
                                    }}>
                                        {done
                                            ? <Check size={16} color="#fff" />
                                            : <Icon size={16} color={active ? '#a5b4fc' : '#475569'} />}
                                    </div>
                                    <span style={{ fontSize: '10px', color: active ? '#a5b4fc' : '#475569', display: 'none' }}
                                        className="sm:block">{s.title}</span>
                                </div>
                            );
                        })}
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 4, background: 'rgba(51,65,85,0.8)', borderRadius: 4, overflow: 'hidden' }}>
                        <motion.div
                            style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                            animate={{ width: `${(step / STEPS.length) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>

                {/* ── Form card ── */}
                <div className="glass" style={{ borderRadius: '20px', padding: '36px' }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 24 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -24 }}
                            transition={{ duration: 0.22 }}
                        >

                            {/* ── STEP 1: Basic Info ── */}
                            {step === 1 && (
                                <div>
                                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Let's get started</h2>
                                    <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '14px' }}>Create your free account</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <input style={inputStyle} placeholder="First Name *" value={form.firstName}
                                                onChange={e => set_('firstName', e.target.value)} />
                                            <input style={inputStyle} placeholder="Last Name" value={form.lastName}
                                                onChange={e => set_('lastName', e.target.value)} />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <input style={inputStyle} type="number" min="14" max="100"
                                                placeholder="Age (optional)" value={form.age}
                                                onChange={e => set_('age', e.target.value)} />
                                            <input style={inputStyle} type="tel"
                                                placeholder="Phone (optional)" value={form.phone}
                                                onChange={e => set_('phone', e.target.value)} />
                                        </div>
                                        <input style={inputStyle} type="email" placeholder="Email address *"
                                            value={form.email} onChange={e => set_('email', e.target.value)}
                                            autoComplete="email" />
                                        <div style={{ position: 'relative' }}>
                                            <input style={{ ...inputStyle, paddingRight: '48px' }}
                                                type={showPw ? 'text' : 'password'}
                                                placeholder="Password (min 8 chars) *"
                                                value={form.password} onChange={e => set_('password', e.target.value)}
                                                autoComplete="new-password" />
                                            <button type="button" onClick={() => setShowPw(v => !v)}
                                                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <input style={{ ...inputStyle, paddingRight: '48px' }}
                                                type={showPwC ? 'text' : 'password'}
                                                placeholder="Confirm Password *"
                                                value={form.passwordConfirm} onChange={e => set_('passwordConfirm', e.target.value)}
                                                autoComplete="new-password" />
                                            <button type="button" onClick={() => setShowPwC(v => !v)}
                                                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                                {showPwC ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── STEP 2: Education ── */}
                            {step === 2 && (
                                <div>
                                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Your Education</h2>
                                    <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '14px' }}>Tell us about your academic background</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        <select style={selectStyle} value={form.degree} onChange={e => set_('degree', e.target.value)}>
                                            <option value="">Select Degree *</option>
                                            {DEGREE_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                        </select>
                                        <input style={inputStyle} placeholder="Field of Study (e.g., Computer Science)"
                                            value={form.field} onChange={e => set_('field', e.target.value)} />
                                        <input style={inputStyle} placeholder="Institution / University Name"
                                            value={form.institution} onChange={e => set_('institution', e.target.value)} />
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <input style={inputStyle} placeholder="Graduation Year (e.g., 2025)"
                                                value={form.graduationYear} onChange={e => set_('graduationYear', e.target.value)} />
                                            <input style={inputStyle} placeholder="GPA / CGPA (optional)"
                                                value={form.gpa} onChange={e => set_('gpa', e.target.value)} />
                                        </div>
                                        <div>
                                            <FieldLabel>Current Status</FieldLabel>
                                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                                {[
                                                    { v: 'student', l: '🎓 Student' },
                                                    { v: 'graduate', l: '🏫 Graduate' },
                                                    { v: 'working', l: '💼 Working' },
                                                ].map(({ v, l }) => (
                                                    <Tag key={v} label={l} active={form.status === v}
                                                        onClick={() => set_('status', v)} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── STEP 3: Qualifications ── */}
                            {step === 3 && (
                                <div>
                                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Qualifications</h2>
                                    <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '14px' }}>Add certifications, courses, or achievements (optional)</p>

                                    {/* Existing qualifications */}
                                    {form.qualifications.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                                            {form.qualifications.map((q, i) => (
                                                <div key={i} style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '10px 14px', borderRadius: '10px',
                                                    background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
                                                }}>
                                                    <div>
                                                        <p style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '14px' }}>{q.title}</p>
                                                        {(q.issuer || q.year) && (
                                                            <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>
                                                                {q.issuer}{q.issuer && q.year ? ' · ' : ''}{q.year}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <button type="button" onClick={() => removeQual(i)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Add new qualification */}
                                    <div style={{
                                        padding: '16px', borderRadius: '12px',
                                        background: 'rgba(15,23,42,0.4)', border: '1px dashed rgba(255,255,255,0.15)',
                                        display: 'flex', flexDirection: 'column', gap: '10px',
                                    }}>
                                        <FieldLabel>Add Certification / Course</FieldLabel>
                                        <input style={inputStyle} placeholder="Title (e.g., AWS Cloud Practitioner) *"
                                            value={qualDraft.title} onChange={e => setQualDraft(d => ({ ...d, title: e.target.value }))} />
                                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                                            <input style={inputStyle} placeholder="Issuing body (optional)"
                                                value={qualDraft.issuer} onChange={e => setQualDraft(d => ({ ...d, issuer: e.target.value }))} />
                                            <input style={inputStyle} placeholder="Year"
                                                value={qualDraft.year} onChange={e => setQualDraft(d => ({ ...d, year: e.target.value }))} />
                                        </div>
                                        <button type="button" onClick={addQual}
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                padding: '10px 18px', borderRadius: '10px', border: 'none',
                                                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                                color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                                                opacity: qualDraft.title.trim() ? 1 : 0.5,
                                            }}>
                                            <Plus size={16} /> Add
                                        </button>
                                    </div>
                                    <p style={{ color: '#64748b', fontSize: '12px', marginTop: '10px' }}>
                                        You can skip this step and fill in later from your profile.
                                    </p>
                                </div>
                            )}

                            {/* ── STEP 4: Skills ── */}
                            {step === 4 && (
                                <div>
                                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Your Skills</h2>
                                    <p style={{ color: '#94a3b8', marginBottom: '20px', fontSize: '14px' }}>Select up to 10 skills — these power your AI recommendations</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingBottom: '4px' }}>
                                        {SKILL_OPTIONS.map(skill => (
                                            <Tag key={skill} label={skill}
                                                active={form.skills.includes(skill)}
                                                onClick={() => toggle('skills', skill)}
                                                disabled={!form.skills.includes(skill) && form.skills.length >= 10} />
                                        ))}
                                    </div>
                                    <p style={{ color: '#64748b', fontSize: '12px', marginTop: '12px' }}>
                                        {form.skills.length}/10 selected
                                    </p>
                                </div>
                            )}

                            {/* ── STEP 5: Experience & Links ── */}
                            {step === 5 && (
                                <div>
                                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Experience & Links</h2>
                                    <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '14px' }}>Tell us about yourself and your online presence</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        <textarea style={textareaStyle}
                                            placeholder="Professional bio / summary — what are you looking for?"
                                            value={form.bio} onChange={e => set_('bio', e.target.value)} />

                                        <div>
                                            <FieldLabel>Experience Level</FieldLabel>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {EXP_LEVELS.map(({ value, label }) => (
                                                    <Tag key={value} label={label}
                                                        active={form.experienceLevel === value}
                                                        onClick={() => set_('experienceLevel', value)} />
                                                ))}
                                            </div>
                                        </div>

                                        <input style={inputStyle} type="url"
                                            placeholder="Portfolio URL (optional)"
                                            value={form.portfolioUrl} onChange={e => set_('portfolioUrl', e.target.value)} />
                                        <input style={inputStyle} type="url"
                                            placeholder="LinkedIn URL (optional)"
                                            value={form.linkedinUrl} onChange={e => set_('linkedinUrl', e.target.value)} />
                                        <input style={inputStyle} type="url"
                                            placeholder="GitHub URL (optional)"
                                            value={form.githubUrl} onChange={e => set_('githubUrl', e.target.value)} />
                                    </div>
                                </div>
                            )}

                            {/* ── STEP 6: Job Preferences ── */}
                            {step === 6 && (
                                <div>
                                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Job Preferences</h2>
                                    <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '14px' }}>Help us find the right opportunities for you</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div>
                                            <FieldLabel>What type of work are you looking for?</FieldLabel>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {JOB_TYPES.map(t => (
                                                    <Tag key={t} label={t}
                                                        active={form.preferredJobTypes.includes(t.toLowerCase())}
                                                        onClick={() => toggle('preferredJobTypes', t.toLowerCase())} />
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <FieldLabel>Preferred locations</FieldLabel>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {LOCATIONS.map(loc => (
                                                    <Tag key={loc} label={loc}
                                                        active={form.preferredLocations.includes(loc)}
                                                        onClick={() => toggle('preferredLocations', loc)} />
                                                ))}
                                            </div>
                                        </div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                            <div
                                                onClick={() => set_('openToRemote', !form.openToRemote)}
                                                style={{
                                                    width: 44, height: 24, borderRadius: 12,
                                                    background: form.openToRemote
                                                        ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                                                        : 'rgba(51,65,85,0.8)',
                                                    position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
                                                }}>
                                                <div style={{
                                                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                                                    position: 'absolute', top: 3,
                                                    left: form.openToRemote ? 23 : 3,
                                                    transition: 'left 0.2s',
                                                }} />
                                            </div>
                                            <span style={{ color: '#cbd5e1', fontSize: '14px' }}>Open to remote work</span>
                                        </label>
                                        <div>
                                            <FieldLabel>Expected salary (optional)</FieldLabel>
                                            <input style={inputStyle} placeholder="e.g. ₹8–12 LPA or $80k–$100k"
                                                value={form.expectedSalary} onChange={e => set_('expectedSalary', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── STEP 7: Resume ── */}
                            {step === 7 && (
                                <div>
                                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Your Resume</h2>
                                    <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '14px' }}>Upload or paste your resume — this powers AI job matching</p>

                                    {/* File upload zone */}
                                    <div
                                        onClick={() => resumeInputRef.current?.click()}
                                        style={{
                                            padding: '28px 20px',
                                            borderRadius: '14px',
                                            border: '2px dashed',
                                            borderColor: form.resumeFile ? '#6366f1' : 'rgba(255,255,255,0.15)',
                                            background: form.resumeFile ? 'rgba(99,102,241,0.08)' : 'rgba(15,23,42,0.4)',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            marginBottom: '16px',
                                        }}>
                                        <input
                                            ref={resumeInputRef}
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            style={{ display: 'none' }}
                                            onChange={e => set_('resumeFile', e.target.files[0] || null)}
                                        />
                                        {form.resumeFile ? (
                                            <div>
                                                <Check size={32} color="#6366f1" style={{ margin: '0 auto 8px' }} />
                                                <p style={{ color: '#a5b4fc', fontWeight: 600 }}>{form.resumeFile.name}</p>
                                                <p style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
                                                    {(form.resumeFile.size / 1024).toFixed(1)} KB
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={e => { e.stopPropagation(); set_('resumeFile', null); }}
                                                    style={{ marginTop: '8px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>
                                                    Remove
                                                </button>
                                            </div>
                                        ) : (
                                            <div>
                                                <Upload size={32} color="#475569" style={{ margin: '0 auto 10px' }} />
                                                <p style={{ color: '#94a3b8', fontWeight: 600 }}>Click to upload resume</p>
                                                <p style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>PDF, DOC, DOCX — max 5MB</p>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '12px 0' }}>
                                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
                                        <span style={{ color: '#64748b', fontSize: '13px' }}>or paste text</span>
                                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
                                    </div>

                                    <textarea
                                        style={{ ...textareaStyle, minHeight: '130px', fontFamily: 'monospace', fontSize: '13px' }}
                                        placeholder="Paste your resume content here…"
                                        value={form.resumeText}
                                        onChange={e => set_('resumeText', e.target.value)}
                                    />
                                    <p style={{ color: '#64748b', fontSize: '12px', marginTop: '8px' }}>
                                        You can also skip and add your resume later from your profile.
                                    </p>
                                </div>
                            )}

                        </motion.div>
                    </AnimatePresence>

                    {/* ── Error display ── */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                marginTop: '16px', padding: '12px 16px',
                                borderRadius: '10px',
                                background: 'rgba(239,68,68,0.12)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                color: '#f87171', fontSize: '14px',
                            }}>
                            {typeof error === 'string' ? error : JSON.stringify(error)}
                        </motion.div>
                    )}

                    {/* ── Navigation ── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px', gap: '12px' }}>
                        <button
                            type="button"
                            onClick={handleBack}
                            disabled={step === 1}
                            className="btn btn-outline"
                            style={{ opacity: step === 1 ? 0.35 : 1 }}>
                            <ChevronLeft size={18} /> Back
                        </button>

                        {step < 7 ? (
                            <button type="button" onClick={handleNext} className="btn btn-primary">
                                Continue <ChevronRight size={18} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="btn btn-primary">
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Creating account…
                                    </>
                                ) : (
                                    <><Check size={18} /> Complete Setup</>
                                )}
                            </button>
                        )}
                    </div>

                    <p style={{ textAlign: 'center', marginTop: '20px', color: '#64748b', fontSize: '13px' }}>
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
