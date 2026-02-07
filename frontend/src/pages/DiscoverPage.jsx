/**
 * Discovery page - Hinge-style job swiping
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Menu, User, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { CardStack, SwipeActions } from '../components/SwipeCard';
import { useJobsStore } from '../store/jobsStore';
import { useAuthStore } from '../store/authStore';
import { ApplyModal } from '../components/ApplyModal';

export function DiscoverPage() {
    const { jobs, currentIndex, fetchRecommended, skipJob, saveJob, applyToJob, isLoading } = useJobsStore();
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);
    const [showMenu, setShowMenu] = useState(false);

    useEffect(() => {
        fetchRecommended();
    }, [fetchRecommended]);

    const currentJob = jobs[currentIndex];

    const handleSwipe = (action) => {
        if (!currentJob) return;

        if (action === 'skip') {
            skipJob();
        } else if (action === 'save') {
            saveJob(currentJob);
        } else if (action === 'apply') {
            setSelectedJob(currentJob);
            setShowApplyModal(true);
        }
    };

    const handleApply = async () => {
        if (selectedJob) {
            await applyToJob(selectedJob);
            setShowApplyModal(false);
            setSelectedJob(null);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="glass border-b border-white/10 px-6 py-4">
                <div className="max-w-lg mx-auto flex justify-between items-center">
                    <Link to="/discover" className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                            <Briefcase size={20} className="text-white" />
                        </div>
                        <span className="font-bold text-lg">NextStep</span>
                    </Link>

                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-2 hover:bg-white/5 rounded-lg transition"
                        >
                            <Menu size={24} />
                        </button>

                        {showMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute right-0 top-12 w-48 glass rounded-xl overflow-hidden z-50"
                            >
                                <Link
                                    to="/profile"
                                    className="flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition"
                                    onClick={() => setShowMenu(false)}
                                >
                                    <User size={18} />
                                    Profile
                                </Link>
                                <Link
                                    to="/saved"
                                    className="flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition"
                                    onClick={() => setShowMenu(false)}
                                >
                                    <Briefcase size={18} />
                                    Saved Jobs
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition w-full text-left text-red-400"
                                >
                                    <LogOut size={18} />
                                    Logout
                                </button>
                            </motion.div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="flex-1 flex flex-col items-center justify-center p-4">
                {isLoading ? (
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-slate-400">Finding your matches...</p>
                    </div>
                ) : (
                    <>
                        <CardStack
                            jobs={jobs}
                            currentIndex={currentIndex}
                            onSwipe={handleSwipe}
                        />

                        <SwipeActions
                            onSkip={() => handleSwipe('skip')}
                            onSave={() => handleSwipe('save')}
                            onApply={() => handleSwipe('apply')}
                            disabled={!currentJob}
                        />

                        <div className="mt-6 text-center text-slate-500 text-sm">
                            <p>Swipe right to apply • Swipe left to skip</p>
                        </div>
                    </>
                )}
            </main>

            {/* Apply Modal */}
            {showApplyModal && selectedJob && (
                <ApplyModal
                    job={selectedJob}
                    onClose={() => setShowApplyModal(false)}
                    onApply={handleApply}
                />
            )}
        </div>
    );
}
