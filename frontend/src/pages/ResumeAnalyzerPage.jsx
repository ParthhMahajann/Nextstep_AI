/**
 * Resume Analyzer Page - AI-powered resume analysis
 * Supports PDF/DOCX file upload and text paste
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    Sparkles,
    FileText,
    CheckCircle,
    AlertCircle,
    Target,
    TrendingUp,
    Lightbulb,
    Briefcase,
    Upload,
    X,
    Type
} from 'lucide-react';
import { aiAPI, savedJobsAPI } from '../api/client';

export function ResumeAnalyzerPage() {
    const [inputMode, setInputMode] = useState('upload'); // 'upload' or 'text'
    const [resumeText, setResumeText] = useState('');
    const [resumeFile, setResumeFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [savedJobs, setSavedJobs] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    // Fetch saved jobs for optional matching
    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const response = await savedJobsAPI.list();
                setSavedJobs(response.data);
            } catch (err) {
                console.error('Failed to fetch saved jobs:', err);
            }
        };
        fetchJobs();
    }, []);

    const isValidFile = (file) => {
        const validTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        const validExtensions = ['.pdf', '.docx'];
        const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
        return validTypes.includes(file.type) || validExtensions.includes(ext);
    };

    const handleFileSelect = (file) => {
        if (!file) return;

        if (!isValidFile(file)) {
            setError('Please upload a PDF or DOCX file');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setError('File size must be less than 10MB');
            return;
        }

        setResumeFile(file);
        setError(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        handleFileSelect(file);
    };

    const handleFileInput = (e) => {
        const file = e.target.files[0];
        handleFileSelect(file);
    };

    const removeFile = () => {
        setResumeFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const canAnalyze = () => {
        if (inputMode === 'upload') return !!resumeFile;
        return !!resumeText.trim();
    };

    const analyzeResume = async () => {
        if (!canAnalyze()) {
            setError(inputMode === 'upload'
                ? 'Please upload your resume file'
                : 'Please paste your resume text');
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
                if (selectedJobId) {
                    formData.append('job_id', selectedJobId);
                }
                response = await aiAPI.analyzeResume(formData);
            } else {
                const payload = { resume_text: resumeText };
                if (selectedJobId) {
                    payload.job_id = parseInt(selectedJobId);
                }
                response = await aiAPI.analyzeResume(payload);
            }

            setAnalysis(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to analyze resume. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 0.7) return 'text-green-400';
        if (score >= 0.4) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getScoreBg = (score) => {
        if (score >= 0.7) return 'from-green-500/20 to-emerald-500/20';
        if (score >= 0.4) return 'from-yellow-500/20 to-amber-500/20';
        return 'from-red-500/20 to-rose-500/20';
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="glass border-b border-white/10 px-6 py-4">
                <div className="max-w-3xl mx-auto flex items-center gap-4">
                    <Link to="/discover" className="p-2 hover:bg-white/5 rounded-lg transition">
                        <ArrowLeft size={24} />
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                            <FileText size={20} className="text-white" />
                        </div>
                        <h1 className="text-xl font-bold">Resume Analyzer</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto p-6 space-y-6">
                {/* Input Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-2xl p-6"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="text-indigo-400" size={20} />
                        <h2 className="text-lg font-semibold">Analyze Your Resume</h2>
                    </div>

                    <p className="text-slate-400 text-sm mb-4">
                        Upload your resume or paste text to get AI-powered insights on strengths,
                        improvements, and keyword optimization.
                    </p>

                    {/* Input Mode Toggle */}
                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={() => setInputMode('upload')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${inputMode === 'upload'
                                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                                    : 'bg-slate-800/50 text-slate-400 border border-white/10 hover:bg-slate-700/50'
                                }`}
                        >
                            <Upload size={16} />
                            Upload File
                        </button>
                        <button
                            onClick={() => setInputMode('text')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${inputMode === 'text'
                                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                                    : 'bg-slate-800/50 text-slate-400 border border-white/10 hover:bg-slate-700/50'
                                }`}
                        >
                            <Type size={16} />
                            Paste Text
                        </button>
                    </div>

                    {/* File Upload Zone */}
                    {inputMode === 'upload' && (
                        <>
                            {!resumeFile ? (
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`mb-4 border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${isDragging
                                            ? 'border-indigo-500 bg-indigo-500/10'
                                            : 'border-white/20 hover:border-indigo-500/50 hover:bg-indigo-500/5'
                                        }`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                        onChange={handleFileInput}
                                        className="hidden"
                                    />
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                                        <Upload size={28} className="text-indigo-400" />
                                    </div>
                                    <p className="font-medium mb-1">
                                        {isDragging ? 'Drop your resume here' : 'Drag & drop your resume'}
                                    </p>
                                    <p className="text-slate-400 text-sm mb-3">or click to browse files</p>
                                    <p className="text-slate-500 text-xs">Supports PDF and DOCX • Max 10MB</p>
                                </div>
                            ) : (
                                <div className="mb-4 border border-white/10 rounded-xl p-4 flex items-center justify-between bg-slate-800/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                            <FileText size={22} className="text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{resumeFile.name}</p>
                                            <p className="text-slate-400 text-xs">{formatFileSize(resumeFile.size)}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={removeFile}
                                        className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 transition"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {/* Text Input */}
                    {inputMode === 'text' && (
                        <textarea
                            value={resumeText}
                            onChange={(e) => setResumeText(e.target.value)}
                            placeholder="Paste your resume text here..."
                            rows={10}
                            className="input resize-none mb-4"
                            style={{ minHeight: '200px' }}
                        />
                    )}

                    {/* Optional Job Selection */}
                    {savedJobs.length > 0 && (
                        <div className="mb-4">
                            <label className="block text-sm text-slate-400 mb-2">
                                <Briefcase size={14} className="inline mr-1" />
                                Compare against a saved job (optional)
                            </label>
                            <select
                                value={selectedJobId}
                                onChange={(e) => setSelectedJobId(e.target.value)}
                                className="input"
                            >
                                <option value="">No job selected - General analysis</option>
                                {savedJobs.map((item) => (
                                    <option key={item.id} value={item.job?.id || item.id}>
                                        {item.job?.title || item.title} at {item.job?.company || item.company}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-400 text-sm flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {/* Analyze Button */}
                    <button
                        onClick={analyzeResume}
                        disabled={isAnalyzing || !canAnalyze()}
                        className="btn btn-primary w-full gap-2"
                        style={{ opacity: (isAnalyzing || !canAnalyze()) ? 0.5 : 1 }}
                    >
                        {isAnalyzing ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <Sparkles size={18} />
                                Analyze Resume
                            </>
                        )}
                    </button>
                </motion.div>

                {/* Results Section */}
                {analysis && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        {/* Match Score (if job selected) */}
                        {selectedJobId && analysis.match_score !== undefined && (
                            <div className={`glass rounded-2xl p-6 bg-gradient-to-br ${getScoreBg(analysis.match_score)}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Target size={24} className={getScoreColor(analysis.match_score)} />
                                        <div>
                                            <h3 className="font-semibold">Match Score</h3>
                                            <p className="text-sm text-slate-400">How well your resume matches the job</p>
                                        </div>
                                    </div>
                                    <div className={`text-4xl font-bold ${getScoreColor(analysis.match_score)}`}>
                                        {Math.round(analysis.match_score * 100)}%
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Strengths */}
                        <div className="glass rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <CheckCircle className="text-green-400" size={20} />
                                <h3 className="font-semibold">Strengths</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {analysis.strengths.map((strength, index) => (
                                    <span
                                        key={index}
                                        className="px-3 py-1.5 rounded-full bg-green-500/20 text-green-400 text-sm"
                                    >
                                        {strength}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Areas for Improvement */}
                        <div className="glass rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp className="text-yellow-400" size={20} />
                                <h3 className="font-semibold">Areas for Improvement</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {analysis.improvements.map((improvement, index) => (
                                    <span
                                        key={index}
                                        className="px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-400 text-sm"
                                    >
                                        {improvement}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Keywords */}
                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Keywords Found */}
                            <div className="glass rounded-2xl p-6">
                                <h3 className="font-semibold mb-3 text-green-400">✓ Keywords Found</h3>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.keywords_found.map((keyword, index) => (
                                        <span
                                            key={index}
                                            className="px-2 py-1 rounded bg-slate-700 text-sm"
                                        >
                                            {keyword}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Keywords Missing */}
                            <div className="glass rounded-2xl p-6">
                                <h3 className="font-semibold mb-3 text-red-400">✗ Consider Adding</h3>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.keywords_missing.map((keyword, index) => (
                                        <span
                                            key={index}
                                            className="px-2 py-1 rounded bg-slate-700 text-sm"
                                        >
                                            {keyword}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Suggestions */}
                        {analysis.suggestions && (
                            <div className="glass rounded-2xl p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Lightbulb className="text-indigo-400" size={20} />
                                    <h3 className="font-semibold">AI Suggestions</h3>
                                </div>
                                <p className="text-slate-300 leading-relaxed">
                                    {analysis.suggestions}
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </main>
        </div>
    );
}
