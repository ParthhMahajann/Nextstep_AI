/**
 * Resume Analyzer Page — Pinterest light theme
 * Includes: analysis, AI tailoring, resume version management
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, FileText, CheckCircle, AlertCircle, Target,
    TrendingUp, Lightbulb, Upload, X, Type,
    Wand2, Zap, Plus, Trash2, Save, Layers, ChevronDown
} from 'lucide-react';
import { aiAPI, savedJobsAPI, resumeVersionsAPI } from '../api/client';
import { useToast } from '../components/Toast';
import { useIsMobile } from '../hooks/useIsMobile';

// ─── Resume Versions Section ─────────────────────────────────────────────────

function ResumeVersionsPanel() {
    const [versions, setVersions] = useState([]);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newRole, setNewRole] = useState('');
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    const load = async () => {
        try {
            const res = await resumeVersionsAPI.list();
            setVersions(Array.isArray(res.data) ? res.data : (res.data.results || []));
        } catch { /* silent */ }
    };

    useEffect(() => { load(); }, []);

    const create = async () => {
        if (!newName.trim() || !newContent.trim()) return;
        setSaving(true);
        try {
            await resumeVersionsAPI.create({ name: newName, content: newContent, target_role: newRole });
            setCreating(false); setNewName(''); setNewContent(''); setNewRole('');
            await load();
            toast('Resume version saved!', 'success');
        } catch {
            toast('Failed to save version', 'error');
        } finally {
            setSaving(false);
        }
    };

    const remove = async (id) => {
        try {
            await resumeVersionsAPI.delete(id);
            await load();
            toast('Version deleted', 'info');
        } catch {
            toast('Failed to delete', 'error');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            style={{ background: '#ffffff', border: '1px solid #e1e1e1', borderRadius: 20, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Layers size={17} color="#e60023" />
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Resume Versions</h2>
                    {versions.length > 0 && (
                        <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: 'rgba(230,0,35,0.08)', color: '#e60023' }}>
                            {versions.length}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setCreating(v => !v)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 10, border: '1px solid rgba(230,0,35,0.2)', background: 'rgba(230,0,35,0.06)', color: '#e60023', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                    <Plus size={13} /> New Version
                </button>
            </div>

            {/* Create form */}
            <AnimatePresence>
                {creating && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden', marginBottom: 16 }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px', background: 'rgba(230,0,35,0.03)', borderRadius: 14, border: '1px solid rgba(230,0,35,0.12)', marginBottom: 4 }}>
                            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Version name (e.g. 'Frontend v2')" className="input" style={{ fontSize: 13 }} />
                            <input value={newRole} onChange={e => setNewRole(e.target.value)} placeholder="Target role (optional)" className="input" style={{ fontSize: 13 }} />
                            <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Paste resume content here…" rows={6} className="input" style={{ resize: 'none', fontSize: 13, fontFamily: 'monospace', lineHeight: 1.6 }} />
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => setCreating(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #e1e1e1', background: '#f3f3f3', color: 'var(--text-muted)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button onClick={create} disabled={saving || !newName.trim() || !newContent.trim()} className="btn btn-primary" style={{ flex: 2, padding: '10px', borderRadius: 10, opacity: (saving || !newName.trim() || !newContent.trim()) ? 0.5 : 1 }}>
                                    <Save size={13} /> {saving ? 'Saving…' : 'Save Version'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Versions list */}
            {versions.length === 0 && !creating ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                    No saved versions yet. Create one to track resume iterations.
                </p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {versions.map(v => (
                        <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: '#f9f9f9', border: '1px solid #e1e1e1' }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(230,0,35,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <FileText size={16} color="#e60023" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</p>
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                    {v.target_role && <>{v.target_role} · </>}
                                    {new Date(v.updated_at).toLocaleDateString()}
                                </p>
                            </div>
                            <button
                                onClick={() => remove(v.id)}
                                style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', cursor: 'pointer', flexShrink: 0 }}
                            >
                                <Trash2 size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}

// ─── Resume Tailoring Section ─────────────────────────────────────────────────

function TailorResumePanel({ savedJobs }) {
    const [resumeText, setResumeText] = useState('');
    const [jobId, setJobId] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [tailoring, setTailoring] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const toast = useToast();

    const tailor = async () => {
        if (!resumeText.trim()) { setError('Please paste your resume text'); return; }
        if (!jobId && !jobTitle.trim()) { setError('Please select a job or enter a job title'); return; }
        setTailoring(true); setError(null); setResult(null);
        try {
            const payload = { resume_text: resumeText };
            if (jobId) payload.job_id = parseInt(jobId);
            else { payload.job_title = jobTitle; }
            const res = await aiAPI.tailorResume(payload);
            setResult(res.data);
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to tailor resume. Please try again.');
        } finally {
            setTailoring(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast('Copied to clipboard!', 'success');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{ background: '#ffffff', border: '1px solid #e1e1e1', borderRadius: 20, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Wand2 size={17} color="#e60023" />
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>AI Resume Tailoring</h2>
                <span style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: 'rgba(230,0,35,0.08)', color: '#e60023' }}>AI</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
                Paste your resume and select a job — AI will rewrite it to maximize ATS score and match.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <textarea
                    value={resumeText}
                    onChange={e => setResumeText(e.target.value)}
                    placeholder="Paste your resume text here…"
                    rows={8}
                    className="input"
                    style={{ resize: 'none', fontSize: 13, fontFamily: 'monospace', lineHeight: 1.6 }}
                />

                {savedJobs.length > 0 ? (
                    <select value={jobId} onChange={e => setJobId(e.target.value)} className="input" style={{ fontSize: 13 }}>
                        <option value="">Select a job to tailor for…</option>
                        {savedJobs.map(item => (
                            <option key={item.id} value={item.job.id}>
                                {item.job.title} at {item.job.company}
                            </option>
                        ))}
                    </select>
                ) : (
                    <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Job title (e.g. 'Senior React Developer')" className="input" style={{ fontSize: 13 }} />
                )}

                {error && (
                    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertCircle size={14} /> {error}
                    </div>
                )}

                <button
                    onClick={tailor}
                    disabled={tailoring || !resumeText.trim()}
                    className="btn btn-primary"
                    style={{ width: '100%', opacity: (tailoring || !resumeText.trim()) ? 0.55 : 1, fontSize: 15, padding: '13px', gap: 8 }}
                >
                    {tailoring ? (
                        <><div className="ai-pulse" style={{ gap: 4 }}><div className="ai-pulse-dot" style={{ width: 6, height: 6 }} /><div className="ai-pulse-dot" style={{ width: 6, height: 6 }} /><div className="ai-pulse-dot" style={{ width: 6, height: 6 }} /></div>Tailoring…</>
                    ) : (
                        <><Wand2 size={16} /> Tailor Resume</>
                    )}
                </button>
            </div>

            {/* Results */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}
                    >
                        {/* ATS Score */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div style={{ padding: '16px', borderRadius: 14, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', textAlign: 'center' }}>
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>ATS Before</p>
                                <p style={{ fontSize: 32, fontWeight: 900, color: '#f87171' }}>{result.ats_score_before}%</p>
                            </div>
                            <div style={{ padding: '16px', borderRadius: 14, background: 'rgba(0,168,107,0.06)', border: '1px solid rgba(0,168,107,0.15)', textAlign: 'center' }}>
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>ATS After</p>
                                <p style={{ fontSize: 32, fontWeight: 900, color: '#00a86b' }}>{result.ats_score_after}%</p>
                            </div>
                        </div>

                        {/* Changes */}
                        {result.changes?.length > 0 && (
                            <div style={{ padding: 18, borderRadius: 14, background: 'rgba(230,0,35,0.03)', border: '1px solid rgba(230,0,35,0.12)' }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#e60023', marginBottom: 10 }}>Changes Made</p>
                                <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {result.changes.map((c, i) => (
                                        <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Tailored resume */}
                        <div style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Tailored Resume</p>
                                <button
                                    onClick={() => copyToClipboard(result.tailored_resume)}
                                    style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(230,0,35,0.2)', background: 'rgba(230,0,35,0.06)', color: '#e60023', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Copy
                                </button>
                            </div>
                            <pre style={{
                                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                fontSize: 12, lineHeight: 1.7, color: 'var(--text-secondary)',
                                background: '#f9f9f9', border: '1px solid #e1e1e1',
                                borderRadius: 12, padding: 16, margin: 0, maxHeight: 400, overflowY: 'auto',
                            }}>
                                {result.tailored_resume}
                            </pre>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ResumeAnalyzerPage() {
    const isMobile = useIsMobile();
    const [inputMode, setInputMode] = useState('upload');
    const [resumeText, setResumeText] = useState('');
    const [resumeFile, setResumeFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [savedJobs, setSavedJobs] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [error, setError] = useState(null);
    const [activeSection, setActiveSection] = useState('analyze');
    const fileInputRef = useRef(null);

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const response = await savedJobsAPI.list();
                const items = Array.isArray(response.data)
                    ? response.data
                    : (response.data.results || []);
                setSavedJobs(items.filter(item => item.job));
            } catch { /* silent */ }
        };
        fetchJobs();
    }, []);

    const isValidFile = (file) => {
        const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
        return validTypes.includes(file.type) || ['.pdf', '.docx'].includes(ext);
    };

    const handleFileSelect = (file) => {
        if (!file) return;
        if (!isValidFile(file)) { setError('Please upload a PDF or DOCX file'); return; }
        if (file.size > 10 * 1024 * 1024) { setError('File size must be less than 10MB'); return; }
        setResumeFile(file);
        setError(null);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileSelect(e.dataTransfer.files[0]);
    };

    const canAnalyze = () => inputMode === 'upload' ? !!resumeFile : !!resumeText.trim();

    const analyzeResume = async () => {
        if (!canAnalyze()) {
            setError(inputMode === 'upload' ? 'Please upload your resume file' : 'Please paste your resume text');
            return;
        }
        setIsAnalyzing(true);
        setError(null);
        setAnalysis(null);
        try {
            let response;
            if (inputMode === 'upload' && resumeFile) {
                const formData = new FormData();
                formData.append('resume_file', resumeFile);
                if (selectedJobId) formData.append('job_id', selectedJobId);
                response = await aiAPI.analyzeResume(formData);
            } else {
                const payload = { resume_text: resumeText };
                if (selectedJobId) payload.job_id = parseInt(selectedJobId);
                response = await aiAPI.analyzeResume(payload);
            }
            setAnalysis(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to analyze resume. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const scoreColor = (s) => s >= 0.7 ? '#00a86b' : s >= 0.4 ? '#d97706' : '#f87171';
    const scoreBg = (s) => s >= 0.7 ? 'rgba(0,168,107,0.06)' : s >= 0.4 ? 'rgba(217,119,6,0.06)' : 'rgba(248,113,113,0.06)';
    const scoreBorder = (s) => s >= 0.7 ? 'rgba(0,168,107,0.18)' : s >= 0.4 ? 'rgba(217,119,6,0.18)' : 'rgba(248,113,113,0.18)';
    const fmtSize = (b) => b < 1024 * 1024 ? (b / 1024).toFixed(1) + ' KB' : (b / 1024 / 1024).toFixed(1) + ' MB';

    const SECTIONS = [
        { key: 'analyze', label: 'Analyze', icon: Sparkles },
        { key: 'tailor', label: 'Tailor', icon: Wand2 },
        { key: 'versions', label: 'Versions', icon: Layers },
    ];

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
                        Resume
                    </h1>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: 'rgba(230,0,35,0.08)', border: '1px solid rgba(230,0,35,0.15)' }}>
                        <Sparkles size={12} color="#e60023" />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#e60023' }}>AI-Powered</span>
                    </div>
                </div>
            </header>

            <main style={{ maxWidth: 680, width: '100%', margin: '0 auto', padding: '20px 16px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Section tabs */}
                <div style={{ display: 'flex', gap: 6, padding: 5, borderRadius: 16, background: '#f3f3f3', border: '1px solid #e1e1e1' }}>
                    {SECTIONS.map(({ key, label, icon: Icon }) => {
                        const active = activeSection === key;
                        return (
                            <button key={key} onClick={() => setActiveSection(key)} style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                padding: '9px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                                fontWeight: 700, fontSize: 13, transition: 'all 0.2s',
                                background: active ? '#ffffff' : 'transparent',
                                color: active ? '#e60023' : 'var(--text-muted)',
                                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                                outline: active ? '1px solid rgba(230,0,35,0.15)' : '1px solid transparent',
                            }}>
                                <Icon size={14} /> {label}
                            </button>
                        );
                    })}
                </div>

                {/* Analyze section */}
                {activeSection === 'analyze' && (
                    <>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{ background: '#ffffff', border: '1px solid #e1e1e1', borderRadius: 20, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                        >
                            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Sparkles size={17} color="#e60023" /> Analyze Your Resume
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
                                Get AI-powered insights on strengths, improvements, and keyword optimization.
                            </p>

                            {/* Mode toggle */}
                            <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
                                {[{ key: 'upload', icon: Upload, label: 'Upload File' }, { key: 'text', icon: Type, label: 'Paste Text' }].map(({ key, icon: Icon, label }) => (
                                    <button key={key} onClick={() => setInputMode(key)} style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                                        cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                                        background: inputMode === key ? 'rgba(230,0,35,0.08)' : '#f3f3f3',
                                        color: inputMode === key ? '#e60023' : 'var(--text-muted)',
                                        outline: inputMode === key ? '1px solid rgba(230,0,35,0.25)' : '1px solid #e1e1e1',
                                    }}>
                                        <Icon size={14} /> {label}
                                    </button>
                                ))}
                            </div>

                            {/* File upload */}
                            {inputMode === 'upload' && (
                                <AnimatePresence mode="wait">
                                    {!resumeFile ? (
                                        <motion.div
                                            key="dropzone"
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                            onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
                                            onDrop={handleDrop}
                                            onClick={() => fileInputRef.current?.click()}
                                            onMouseOver={e => { if (!isMobile) e.currentTarget.style.borderColor = '#e60023'; }}
                                            onMouseOut={e => { if (!isMobile) e.currentTarget.style.borderColor = isDragging ? '#e60023' : '#d0d0d0'; }}
                                            style={{
                                                marginBottom: 16, borderRadius: 14, padding: isMobile ? '32px 20px' : '40px 20px', textAlign: 'center',
                                                cursor: 'pointer', transition: 'all 0.2s',
                                                border: `1.5px dashed ${isDragging ? '#e60023' : '#d0d0d0'}`,
                                                background: isDragging ? 'rgba(230,0,35,0.04)' : '#fafafa',
                                            }}
                                        >
                                            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" onChange={e => handleFileSelect(e.target.files[0])} style={{ display: 'none' }} />
                                            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(230,0,35,0.08)', border: '1px solid rgba(230,0,35,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                                                <Upload size={isMobile ? 32 : 40} color="#e60023" />
                                            </div>
                                            <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                                                {isMobile ? 'Tap to upload resume' : 'Drop your resume here'}
                                            </p>
                                            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>
                                                {isMobile ? 'PDF, DOC, or DOCX' : 'or click to browse — PDF, DOC, DOCX'}
                                            </p>
                                            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Max 10MB</p>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="file"
                                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                            style={{ marginBottom: 16, border: '1px solid rgba(0,168,107,0.2)', borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,168,107,0.04)' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(230,0,35,0.08)', border: '1px solid rgba(230,0,35,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <FileText size={20} color="#e60023" />
                                                </div>
                                                <div>
                                                    <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{resumeFile.name}</p>
                                                    <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{fmtSize(resumeFile.size)}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => { setResumeFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                                style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', cursor: 'pointer' }}>
                                                <X size={15} />
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            )}

                            {/* Text input */}
                            {inputMode === 'text' && (
                                <textarea
                                    value={resumeText}
                                    onChange={e => setResumeText(e.target.value)}
                                    placeholder="Paste your resume text here..."
                                    rows={9}
                                    className="input"
                                    style={{ resize: 'none', minHeight: 200, marginBottom: 16, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }}
                                />
                            )}

                            {/* Job selector */}
                            {savedJobs.length > 0 && (
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Compare against saved job (optional)
                                    </label>
                                    <select value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)} className="input">
                                        <option value="">No job — general analysis</option>
                                        {savedJobs.map(item => (
                                            <option key={item.id} value={item.job.id}>
                                                {item.job.title} at {item.job.company}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {error && (
                                <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <AlertCircle size={14} /> {error}
                                </div>
                            )}

                            <button
                                onClick={analyzeResume}
                                disabled={isAnalyzing || !canAnalyze()}
                                className="btn btn-primary"
                                style={{ width: '100%', opacity: (isAnalyzing || !canAnalyze()) ? 0.55 : 1, fontSize: 15, padding: '13px', gap: 8 }}
                            >
                                {isAnalyzing ? (
                                    <><div className="ai-pulse" style={{ gap: 4 }}><div className="ai-pulse-dot" style={{ width: 6, height: 6 }} /><div className="ai-pulse-dot" style={{ width: 6, height: 6 }} /><div className="ai-pulse-dot" style={{ width: 6, height: 6 }} /></div>Analyzing…</>
                                ) : (
                                    <><Sparkles size={16} /> Analyze Resume</>
                                )}
                            </button>
                        </motion.div>

                        {/* Results */}
                        <AnimatePresence>
                            {analysis && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                                >
                                    {selectedJobId && analysis.match_score !== undefined && (
                                        <div style={{ background: scoreBg(analysis.match_score), border: `1px solid ${scoreBorder(analysis.match_score)}`, borderRadius: 20, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <Target size={24} color={scoreColor(analysis.match_score)} />
                                                <div>
                                                    <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>Match Score</h3>
                                                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Resume vs job requirements</p>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: 44, fontWeight: 900, color: scoreColor(analysis.match_score), letterSpacing: '-0.02em' }}>
                                                {Math.round(analysis.match_score * 100)}%
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ background: '#ffffff', border: '1px solid #e1e1e1', borderRadius: 20, padding: 22, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                            <CheckCircle size={18} color="#00a86b" />
                                            <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>Strengths</h3>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {analysis.strengths?.map((s, i) => (
                                                <span key={i} style={{ padding: '6px 14px', borderRadius: 999, fontSize: 13, background: 'rgba(0,168,107,0.08)', color: '#00a86b', border: '1px solid rgba(0,168,107,0.2)' }}>{s}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ background: '#ffffff', border: '1px solid #e1e1e1', borderRadius: 20, padding: 22, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                            <TrendingUp size={18} color="#d97706" />
                                            <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>Areas for Improvement</h3>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {analysis.improvements?.map((s, i) => (
                                                <span key={i} style={{ padding: '6px 14px', borderRadius: 999, fontSize: 13, background: 'rgba(217,119,6,0.08)', color: '#d97706', border: '1px solid rgba(217,119,6,0.2)' }}>{s}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
                                        <div style={{ background: '#ffffff', border: '1px solid #e1e1e1', borderRadius: 20, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                                            <h3 style={{ fontWeight: 700, color: '#00a86b', fontSize: 14, marginBottom: 12 }}>✓ Keywords Found</h3>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {analysis.keywords_found?.map((k, i) => (
                                                    <span key={i} style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, background: 'rgba(0,168,107,0.06)', color: 'var(--text-secondary)', border: '1px solid rgba(0,168,107,0.15)' }}>{k}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div style={{ background: '#ffffff', border: '1px solid #e1e1e1', borderRadius: 20, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                                            <h3 style={{ fontWeight: 700, color: '#f87171', fontSize: 14, marginBottom: 12 }}>✗ Consider Adding</h3>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {analysis.keywords_missing?.map((k, i) => (
                                                    <span key={i} style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, background: 'rgba(248,113,113,0.06)', color: 'var(--text-secondary)', border: '1px solid rgba(248,113,113,0.15)' }}>{k}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {analysis.suggestions && (
                                        <div style={{ background: '#ffffff', border: '1px solid #e1e1e1', borderRadius: 20, padding: 22, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                                <Lightbulb size={18} color="#e60023" />
                                                <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>AI Suggestions</h3>
                                            </div>
                                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 14 }}>{analysis.suggestions}</p>
                                        </div>
                                    )}

                                    {selectedJobId && analysis.job_tailored_suggestions?.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 }}
                                            style={{ background: 'rgba(230,0,35,0.03)', border: '1px solid rgba(230,0,35,0.12)', borderRadius: 20, padding: 22 }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(230,0,35,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Wand2 size={17} color="#e60023" />
                                                </div>
                                                <div>
                                                    <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>Job-Tailored Suggestions</h3>
                                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Specific edits to match this role</p>
                                                </div>
                                                <span style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: 'rgba(230,0,35,0.08)', color: '#e60023' }}>
                                                    {analysis.job_tailored_suggestions.length}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {analysis.job_tailored_suggestions.map((s, i) => (
                                                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
                                                        style={{ display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'rgba(230,0,35,0.04)', border: '1px solid rgba(230,0,35,0.1)' }}>
                                                        <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 7, background: 'rgba(230,0,35,0.08)', color: '#e60023', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {i + 1}
                                                        </span>
                                                        <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>{s}</p>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                )}

                {activeSection === 'tailor' && <TailorResumePanel savedJobs={savedJobs} />}
                {activeSection === 'versions' && <ResumeVersionsPanel />}
            </main>
        </div>
    );
}
