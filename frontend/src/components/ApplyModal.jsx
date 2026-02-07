/**
 * Apply modal with AI-generated email
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, Copy, ExternalLink, Check } from 'lucide-react';
import { aiAPI } from '../api/client';

export function ApplyModal({ job, onClose, onApply }) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [email, setEmail] = useState(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState(null);

    const generateEmail = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            const response = await aiAPI.generateEmail({ job_id: job.id });
            setEmail(response.data);
        } catch (err) {
            setError('Failed to generate email. You can still apply directly!');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyEmail = () => {
        if (email) {
            navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="glass rounded-2xl w-full max-w-lg max-h-[80vh] overflow-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/10">
                    <div>
                        <h3 className="text-xl font-bold">Apply to {job.company}</h3>
                        <p className="text-slate-400 text-sm">{job.title}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* AI Email Generator */}
                    {!email && !isGenerating && (
                        <button
                            onClick={generateEmail}
                            className="w-full p-4 rounded-xl border-2 border-dashed border-indigo-500/50 hover:border-indigo-500 hover:bg-indigo-500/10 transition text-center"
                        >
                            <Sparkles className="mx-auto mb-2 text-indigo-400" size={32} />
                            <p className="font-medium">Generate AI Email</p>
                            <p className="text-sm text-slate-400">Get a personalized outreach email</p>
                        </button>
                    )}

                    {isGenerating && (
                        <div className="text-center py-8">
                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-slate-400">Crafting your perfect email...</p>
                        </div>
                    )}

                    {email && (
                        <div className="space-y-4">
                            <div className="bg-slate-800/50 rounded-xl p-4">
                                <p className="text-xs text-slate-500 mb-1">Subject</p>
                                <p className="font-medium">{email.subject}</p>
                            </div>
                            <div className="bg-slate-800/50 rounded-xl p-4">
                                <p className="text-xs text-slate-500 mb-1">Email Body</p>
                                <p className="whitespace-pre-wrap text-sm">{email.body}</p>
                            </div>
                            <button
                                onClick={copyEmail}
                                className="btn btn-outline w-full"
                            >
                                {copied ? <Check size={18} /> : <Copy size={18} />}
                                {copied ? 'Copied!' : 'Copy to Clipboard'}
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-white/10 flex gap-3">
                    <a
                        href={job.apply_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onApply}
                        className="btn btn-primary flex-1"
                    >
                        <ExternalLink size={18} />
                        Apply Now
                    </a>
                    <button onClick={onClose} className="btn btn-outline">
                        Later
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
