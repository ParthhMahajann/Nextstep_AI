/**
 * 7-step Signup Wizard — 2026 dark glassmorphism design
 */

import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, GraduationCap, Award, Lightbulb,
    Briefcase, Settings, FileText,
    ChevronRight, ChevronLeft, Check,
    Eye, EyeOff, Upload, X, Plus, Zap
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const STEPS = [
    { id: 1, title: 'Basic Info',    icon: User },
    { id: 2, title: 'Education',     icon: GraduationCap },
    { id: 3, title: 'Certs',         icon: Award },
    { id: 4, title: 'Skills',        icon: Lightbulb },
    { id: 5, title: 'Experience',    icon: Briefcase },
    { id: 6, title: 'Preferences',   icon: Settings },
    { id: 7, title: 'Resume',        icon: FileText },
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
    { value: 'junior',  label: 'Junior (1–2 yrs)' },
    { value: 'mid',     label: 'Mid Level (3–5 yrs)' },
    { value: 'senior',  label: 'Senior (5+ yrs)' },
];
const DEGREE_OPTIONS = [
    { value: 'btech',   label: 'B.Tech / B.E.' },
    { value: 'bsc',     label: 'B.Sc' },
    { value: 'bca',     label: 'BCA' },
    { value: 'bcom',    label: 'B.Com' },
    { value: 'ba',      label: 'B.A.' },
    { value: 'mtech',   label: 'M.Tech / M.E.' },
    { value: 'msc',     label: 'M.Sc' },
    { value: 'mca',     label: 'MCA' },
    { value: 'mba',     label: 'MBA' },
    { value: 'phd',     label: 'Ph.D.' },
    { value: 'diploma', label: 'Diploma' },
    { value: 'other',   label: 'Other' },
];

/* ── Tag pill ── */
function Tag({ label, active, onClick, disabled }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            style={{
                padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                cursor: disabled ? 'not-allowed' : 'pointer', border: 'none',
                transition: 'all 0.15s',
                background: active ? 'rgba(230,0,35,0.08)' : '#f3f3f3',
                color: active ? '#e60023' : 'var(--text-muted)',
                outline: active ? '1px solid rgba(230,0,35,0.25)' : '1px solid #e1e1e1',
                opacity: disabled && !active ? 0.35 : 1,
            }}
        >
            {label}
        </button>
    );
}

function FieldLabel({ children }) {
    return (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            {children}
        </p>
    );
}

/* ── Main component ── */
export function SignupWizard() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [showPw, setShowPw] = useState(false);
    const [showPwC, setShowPwC] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const resumeInputRef = useRef(null);
    const [qualDraft, setQualDraft] = useState({ title: '', issuer: '', year: '' });

    const [form, setForm] = useState({
        firstName: '', lastName: '', age: '', phone: '', email: '',
        password: '', passwordConfirm: '',
        degree: '', field: '', institution: '', graduationYear: '', gpa: '', status: 'student',
        qualifications: [],
        skills: [],
        bio: '', experienceLevel: '', portfolioUrl: '', linkedinUrl: '', githubUrl: '',
        preferredJobTypes: [], preferredLocations: [], openToRemote: true, expectedSalary: '',
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
        if (step === 2 && !form.degree) return 'Please select your degree.';
        return null;
    };

    const handleNext = () => {
        const err = validate();
        if (err) { setError(err); return; }
        setError(null);
        if (step < 7) setStep(s => s + 1);
    };
    const handleBack = () => { setError(null); setStep(s => s - 1); };

    const addQual = () => {
        if (!qualDraft.title.trim()) return;
        setForm(p => ({ ...p, qualifications: [...p.qualifications, { ...qualDraft }] }));
        setQualDraft({ title: '', issuer: '', year: '' });
    };
    const removeQual = (i) =>
        setForm(p => ({ ...p, qualifications: p.qualifications.filter((_, idx) => idx !== i) }));

    const handleSubmit = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const ok = await register({
                firstName: form.firstName, lastName: form.lastName,
                email: form.email, password: form.password,
            });
            if (!ok) { setIsLoading(false); return; }

            const profilePayload = {
                age: form.age || null, phone: form.phone, bio: form.bio,
                experience_level: form.experienceLevel,
                education: {
                    degree: form.degree, field: form.field,
                    institution: form.institution, graduation_year: form.graduationYear,
                    gpa: form.gpa, status: form.status,
                },
                qualifications: form.qualifications,
                portfolio_url: form.portfolioUrl, linkedin_url: form.linkedinUrl,
                github_url: form.githubUrl, preferred_job_types: form.preferredJobTypes,
                preferred_locations: form.preferredLocations,
                open_to_remote: form.openToRemote, expected_salary: form.expectedSalary,
                resume_text: form.resumeText,
            };
            sessionStorage.setItem('pending_profile', JSON.stringify(profilePayload));
            if (form.resumeFile) sessionStorage.setItem('pending_resume_filename', form.resumeFile.name);
            navigate('/verify-email-sent');
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const progress = ((step - 1) / (STEPS.length - 1)) * 100;

    return (
        <div style={{
            minHeight: '100dvh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '20px 16px 40px', position: 'relative', zIndex: 1,
        }}>
            <div style={{ width: '100%', maxWidth: 600 }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div className="logo-mark" style={{ width: 36, height: 36, borderRadius: 11 }}>
                            <Zap size={18} color="#fff" strokeWidth={2.5} />
                        </div>
                        <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                            NextStep<span className="text-gradient">AI</span>
                        </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        Step {step} of {STEPS.length} — {STEPS[step - 1].title}
                    </p>
                </div>

                {/* Step indicators */}
                <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, padding: '0 2px' }}>
                        {STEPS.map((s) => {
                            const Icon = s.icon;
                            const done = s.id < step;
                            const active = s.id === step;
                            return (
                                <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                    <div style={{
                                        width: 36, height: 36, borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: done
                                            ? '#e60023'
                                            : active
                                            ? 'rgba(230,0,35,0.08)'
                                            : '#f3f3f3',
                                        border: active
                                            ? '1.5px solid rgba(230,0,35,0.3)'
                                            : done
                                            ? 'none'
                                            : '1.5px solid #e1e1e1',
                                        transition: 'all 0.3s',
                                    }}>
                                        {done
                                            ? <Check size={15} color="#fff" />
                                            : <Icon size={15} color={active ? '#e60023' : 'var(--text-muted)'} />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 3, background: '#e1e1e1', borderRadius: 99, overflow: 'hidden' }}>
                        <motion.div
                            style={{ height: '100%', borderRadius: 99, background: '#e60023' }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.35 }}
                        />
                    </div>
                </div>

                {/* Form card */}
                <div className="glass-card" style={{ padding: '32px 28px' }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* STEP 1: Basic Info */}
                            {step === 1 && (
                                <div>
                                    <h2 style={{ fontSize: 21, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Let's get started</h2>
                                    <p style={{ color: 'var(--text-muted)', marginBottom: 22, fontSize: 14 }}>Create your free account</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                            <input className="input" placeholder="First Name *" value={form.firstName}
                                                onChange={e => set_('firstName', e.target.value)} />
                                            <input className="input" placeholder="Last Name" value={form.lastName}
                                                onChange={e => set_('lastName', e.target.value)} />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                            <input className="input" type="number" min="14" max="100" placeholder="Age (optional)"
                                                value={form.age} onChange={e => set_('age', e.target.value)} />
                                            <input className="input" type="tel" placeholder="Phone (optional)"
                                                value={form.phone} onChange={e => set_('phone', e.target.value)} />
                                        </div>
                                        <input className="input" type="email" placeholder="Email address *"
                                            value={form.email} onChange={e => set_('email', e.target.value)} autoComplete="email" />
                                        <div style={{ position: 'relative' }}>
                                            <input className="input" style={{ paddingRight: 48 }}
                                                type={showPw ? 'text' : 'password'}
                                                placeholder="Password (min 8 chars) *"
                                                value={form.password} onChange={e => set_('password', e.target.value)}
                                                autoComplete="new-password" />
                                            <button type="button" onClick={() => setShowPw(v => !v)}
                                                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
                                                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <input className="input" style={{ paddingRight: 48 }}
                                                type={showPwC ? 'text' : 'password'}
                                                placeholder="Confirm Password *"
                                                value={form.passwordConfirm} onChange={e => set_('passwordConfirm', e.target.value)}
                                                autoComplete="new-password" />
                                            <button type="button" onClick={() => setShowPwC(v => !v)}
                                                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
                                                {showPwC ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: Education */}
                            {step === 2 && (
                                <div>
                                    <h2 style={{ fontSize: 21, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Your Education</h2>
                                    <p style={{ color: 'var(--text-muted)', marginBottom: 22, fontSize: 14 }}>Tell us about your academic background</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <select className="input" style={{ cursor: 'pointer' }} value={form.degree} onChange={e => set_('degree', e.target.value)}>
                                            <option value="">Select Degree *</option>
                                            {DEGREE_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                        </select>
                                        <input className="input" placeholder="Field of Study (e.g., Computer Science)"
                                            value={form.field} onChange={e => set_('field', e.target.value)} />
                                        <input className="input" placeholder="Institution / University Name"
                                            value={form.institution} onChange={e => set_('institution', e.target.value)} />
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                            <input className="input" placeholder="Graduation Year (e.g., 2025)"
                                                value={form.graduationYear} onChange={e => set_('graduationYear', e.target.value)} />
                                            <input className="input" placeholder="GPA / CGPA (optional)"
                                                value={form.gpa} onChange={e => set_('gpa', e.target.value)} />
                                        </div>
                                        <div>
                                            <FieldLabel>Current Status</FieldLabel>
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                {[{ v: 'student', l: '🎓 Student' }, { v: 'graduate', l: '🏫 Graduate' }, { v: 'working', l: '💼 Working' }].map(({ v, l }) => (
                                                    <Tag key={v} label={l} active={form.status === v} onClick={() => set_('status', v)} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: Qualifications */}
                            {step === 3 && (
                                <div>
                                    <h2 style={{ fontSize: 21, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Qualifications</h2>
                                    <p style={{ color: 'var(--text-muted)', marginBottom: 22, fontSize: 14 }}>Add certifications, courses, or achievements (optional)</p>

                                    {form.qualifications.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                                            {form.qualifications.map((q, i) => (
                                                <div key={i} style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '10px 14px', borderRadius: 12,
                                                    background: 'rgba(230,0,35,0.04)', border: '1px solid rgba(230,0,35,0.12)',
                                                }}>
                                                    <div>
                                                        <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14 }}>{q.title}</p>
                                                        {(q.issuer || q.year) && (
                                                            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                                                                {q.issuer}{q.issuer && q.year ? ' · ' : ''}{q.year}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <button type="button" onClick={() => removeQual(i)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 4 }}>
                                                        <X size={15} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div style={{ padding: 16, borderRadius: 14, background: '#fafafa', border: '1px dashed #d0d0d0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <FieldLabel>Add Certification / Course</FieldLabel>
                                        <input className="input" placeholder="Title (e.g., AWS Cloud Practitioner) *"
                                            value={qualDraft.title} onChange={e => setQualDraft(d => ({ ...d, title: e.target.value }))} />
                                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                                            <input className="input" placeholder="Issuing body (optional)"
                                                value={qualDraft.issuer} onChange={e => setQualDraft(d => ({ ...d, issuer: e.target.value }))} />
                                            <input className="input" placeholder="Year"
                                                value={qualDraft.year} onChange={e => setQualDraft(d => ({ ...d, year: e.target.value }))} />
                                        </div>
                                        <button type="button" onClick={addQual} style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 6,
                                            padding: '9px 16px', borderRadius: 10, border: 'none',
                                            background: qualDraft.title.trim() ? '#e60023' : '#f3f3f3',
                                            color: qualDraft.title.trim() ? '#fff' : 'var(--text-muted)',
                                            fontWeight: 600, fontSize: 13, cursor: qualDraft.title.trim() ? 'pointer' : 'not-allowed',
                                            transition: 'all 0.2s',
                                        }}>
                                            <Plus size={15} /> Add
                                        </button>
                                    </div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 10 }}>
                                        You can skip this step and fill in later.
                                    </p>
                                </div>
                            )}

                            {/* STEP 4: Skills */}
                            {step === 4 && (
                                <div>
                                    <h2 style={{ fontSize: 21, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Your Skills</h2>
                                    <p style={{ color: 'var(--text-muted)', marginBottom: 18, fontSize: 14 }}>Select up to 10 skills — these power your AI recommendations</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 260, overflowY: 'auto', paddingRight: 4, paddingBottom: 4 }}>
                                        {SKILL_OPTIONS.map(skill => (
                                            <Tag key={skill} label={skill}
                                                active={form.skills.includes(skill)}
                                                onClick={() => toggle('skills', skill)}
                                                disabled={!form.skills.includes(skill) && form.skills.length >= 10} />
                                        ))}
                                    </div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 12 }}>
                                        {form.skills.length}/10 selected
                                    </p>
                                </div>
                            )}

                            {/* STEP 5: Experience & Links */}
                            {step === 5 && (
                                <div>
                                    <h2 style={{ fontSize: 21, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Experience & Links</h2>
                                    <p style={{ color: 'var(--text-muted)', marginBottom: 22, fontSize: 14 }}>Tell us about yourself and your online presence</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <textarea className="input" style={{ resize: 'none', minHeight: 100, lineHeight: 1.6 }}
                                            placeholder="Professional bio — what are you looking for?"
                                            value={form.bio} onChange={e => set_('bio', e.target.value)} />
                                        <div>
                                            <FieldLabel>Experience Level</FieldLabel>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                {EXP_LEVELS.map(({ value, label }) => (
                                                    <Tag key={value} label={label}
                                                        active={form.experienceLevel === value}
                                                        onClick={() => set_('experienceLevel', value)} />
                                                ))}
                                            </div>
                                        </div>
                                        <input className="input" type="url" placeholder="Portfolio URL (optional)"
                                            value={form.portfolioUrl} onChange={e => set_('portfolioUrl', e.target.value)} />
                                        <input className="input" type="url" placeholder="LinkedIn URL (optional)"
                                            value={form.linkedinUrl} onChange={e => set_('linkedinUrl', e.target.value)} />
                                        <input className="input" type="url" placeholder="GitHub URL (optional)"
                                            value={form.githubUrl} onChange={e => set_('githubUrl', e.target.value)} />
                                    </div>
                                </div>
                            )}

                            {/* STEP 6: Preferences */}
                            {step === 6 && (
                                <div>
                                    <h2 style={{ fontSize: 21, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Job Preferences</h2>
                                    <p style={{ color: 'var(--text-muted)', marginBottom: 22, fontSize: 14 }}>Help us find the right opportunities</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                        <div>
                                            <FieldLabel>Type of work</FieldLabel>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                {JOB_TYPES.map(t => (
                                                    <Tag key={t} label={t}
                                                        active={form.preferredJobTypes.includes(t.toLowerCase())}
                                                        onClick={() => toggle('preferredJobTypes', t.toLowerCase())} />
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <FieldLabel>Preferred locations</FieldLabel>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                {LOCATIONS.map(loc => (
                                                    <Tag key={loc} label={loc}
                                                        active={form.preferredLocations.includes(loc)}
                                                        onClick={() => toggle('preferredLocations', loc)} />
                                                ))}
                                            </div>
                                        </div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                                            <div onClick={() => set_('openToRemote', !form.openToRemote)}
                                                style={{
                                                    width: 44, height: 24, borderRadius: 12, flexShrink: 0,
                                                    background: form.openToRemote ? '#e60023' : '#e1e1e1',
                                                    position: 'relative', transition: 'background 0.25s', cursor: 'pointer',
                                                }}>
                                                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: form.openToRemote ? 23 : 3, transition: 'left 0.25s' }} />
                                            </div>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Open to remote work</span>
                                        </label>
                                        <div>
                                            <FieldLabel>Expected salary (optional)</FieldLabel>
                                            <input className="input" placeholder="e.g. ₹8–12 LPA or $80k–$100k"
                                                value={form.expectedSalary} onChange={e => set_('expectedSalary', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 7: Resume */}
                            {step === 7 && (
                                <div>
                                    <h2 style={{ fontSize: 21, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Your Resume</h2>
                                    <p style={{ color: 'var(--text-muted)', marginBottom: 22, fontSize: 14 }}>Upload or paste — this powers AI job matching</p>

                                    <div
                                        onClick={() => resumeInputRef.current?.click()}
                                        style={{
                                            padding: '28px 20px', borderRadius: 16, textAlign: 'center',
                                            cursor: 'pointer', transition: 'all 0.2s', marginBottom: 14,
                                            border: `1.5px dashed ${form.resumeFile ? 'rgba(230,0,35,0.3)' : '#d0d0d0'}`,
                                            background: form.resumeFile ? 'rgba(230,0,35,0.04)' : '#fafafa',
                                        }}>
                                        <input ref={resumeInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
                                            onChange={e => set_('resumeFile', e.target.files[0] || null)} />
                                        {form.resumeFile ? (
                                            <div>
                                                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(230,0,35,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                                                    <Check size={22} color="#e60023" />
                                                </div>
                                                <p style={{ color: '#e60023', fontWeight: 600 }}>{form.resumeFile.name}</p>
                                                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                                                    {(form.resumeFile.size / 1024).toFixed(1)} KB
                                                </p>
                                                <button type="button" onClick={e => { e.stopPropagation(); set_('resumeFile', null); }}
                                                    style={{ marginTop: 8, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
                                                    Remove
                                                </button>
                                            </div>
                                        ) : (
                                            <div>
                                                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(230,0,35,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                                                    <Upload size={22} color="#e60023" />
                                                </div>
                                                <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Click to upload resume</p>
                                                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>PDF, DOC, DOCX — max 5MB</p>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0' }}>
                                        <div style={{ flex: 1, height: 1, background: '#e1e1e1' }} />
                                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>or paste text</span>
                                        <div style={{ flex: 1, height: 1, background: '#e1e1e1' }} />
                                    </div>

                                    <textarea className="input" style={{ resize: 'none', minHeight: 120, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6 }}
                                        placeholder="Paste your resume content here…"
                                        value={form.resumeText} onChange={e => set_('resumeText', e.target.value)} />
                                    <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
                                        You can also skip and add your resume later from your profile.
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Error */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                style={{ marginTop: 14, padding: '11px 15px', borderRadius: 10, background: 'var(--error-bg)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: 13 }}
                            >
                                {typeof error === 'string' ? error : JSON.stringify(error)}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Navigation */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 26, gap: 12 }}>
                        <button type="button" onClick={handleBack} disabled={step === 1}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '11px 18px',
                                borderRadius: 12, border: '1px solid #e1e1e1',
                                background: '#f3f3f3', color: 'var(--text-muted)',
                                fontWeight: 600, fontSize: 14, cursor: step === 1 ? 'not-allowed' : 'pointer',
                                opacity: step === 1 ? 0.3 : 1,
                            }}>
                            <ChevronLeft size={17} /> Back
                        </button>

                        {step < 7 ? (
                            <button type="button" onClick={handleNext} className="btn btn-primary" style={{ gap: 8, padding: '11px 22px' }}>
                                Continue <ChevronRight size={17} />
                            </button>
                        ) : (
                            <button type="button" onClick={handleSubmit} disabled={isLoading} className="btn btn-primary" style={{ gap: 8, padding: '11px 22px' }}>
                                {isLoading ? (
                                    <>
                                        <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%' }} className="animate-spin" />
                                        Creating…
                                    </>
                                ) : (
                                    <><Check size={17} /> Complete Setup</>
                                )}
                            </button>
                        )}
                    </div>

                    <p style={{ textAlign: 'center', marginTop: 18, color: 'var(--text-muted)', fontSize: 13 }}>
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: '#e60023', fontWeight: 700, textDecoration: 'none' }}>
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
