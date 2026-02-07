/**
 * Saved jobs page
 */

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    Bookmark,
    CheckCircle,
    ExternalLink,
    Building2,
    MapPin,
    Trash2
} from 'lucide-react';
import { useJobsStore } from '../store/jobsStore';
import { savedJobsAPI } from '../api/client';

export function SavedJobsPage() {
    const { savedJobs, appliedJobs, fetchSavedJobs } = useJobsStore();

    useEffect(() => {
        fetchSavedJobs();
    }, [fetchSavedJobs]);

    const removeJob = async (id) => {
        await savedJobsAPI.delete(id);
        fetchSavedJobs();
    };

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="glass border-b border-white/10 px-6 py-4">
                <div className="max-w-2xl mx-auto flex items-center gap-4">
                    <Link to="/discover" className="p-2 hover:bg-white/5 rounded-lg">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="text-xl font-bold">My Jobs</h1>
                </div>
            </header>

            <main className="max-w-2xl mx-auto p-6 space-y-8">
                {/* Applied Jobs */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <CheckCircle className="text-green-400" size={20} />
                        <h2 className="text-lg font-semibold">Applied ({appliedJobs.length})</h2>
                    </div>

                    {appliedJobs.length === 0 ? (
                        <p className="text-slate-500 py-4">No applications yet. Start swiping!</p>
                    ) : (
                        <div className="space-y-3">
                            {appliedJobs.map((item, index) => (
                                <motion.div
                                    key={item.id || index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="glass rounded-xl p-4 flex justify-between items-center"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl gradient-success flex items-center justify-center">
                                            <Building2 size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-medium">{item.job?.title || item.title}</h3>
                                            <p className="text-sm text-slate-400 flex items-center gap-1">
                                                <MapPin size={12} />
                                                {item.job?.company || item.company}
                                            </p>
                                        </div>
                                    </div>
                                    <a
                                        href={item.job?.apply_link || item.apply_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 hover:bg-white/5 rounded-lg text-indigo-400"
                                    >
                                        <ExternalLink size={18} />
                                    </a>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Saved Jobs */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Bookmark className="text-yellow-400" size={20} />
                        <h2 className="text-lg font-semibold">Saved ({savedJobs.length})</h2>
                    </div>

                    {savedJobs.length === 0 ? (
                        <p className="text-slate-500 py-4">No saved jobs. Swipe up to save for later!</p>
                    ) : (
                        <div className="space-y-3">
                            {savedJobs.map((item, index) => (
                                <motion.div
                                    key={item.id || index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="glass rounded-xl p-4 flex justify-between items-center"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                                            <Bookmark size={20} className="text-yellow-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium">{item.job?.title || item.title}</h3>
                                            <p className="text-sm text-slate-400">
                                                {item.job?.company || item.company}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <a
                                            href={item.job?.apply_link || item.apply_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 hover:bg-white/5 rounded-lg text-indigo-400"
                                        >
                                            <ExternalLink size={18} />
                                        </a>
                                        <button
                                            onClick={() => removeJob(item.id)}
                                            className="p-2 hover:bg-red-500/10 rounded-lg text-red-400"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
