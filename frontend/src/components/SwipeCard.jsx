/**
 * Swipeable job card component with Framer Motion
 */

import { useState } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import {
    MapPin,
    Building2,
    Clock,
    Star,
    ExternalLink,
    Briefcase,
    X,
    Bookmark,
    Check
} from 'lucide-react';

export function SwipeCard({ job, onSwipe, isTop }) {
    const [exitX, setExitX] = useState(0);

    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

    // Background color based on drag direction
    const leftIndicator = useTransform(x, [-100, 0], [1, 0]);
    const rightIndicator = useTransform(x, [0, 100], [0, 1]);

    const handleDragEnd = (_, info) => {
        const threshold = 100;

        if (info.offset.x > threshold) {
            setExitX(300);
            onSwipe('apply');
        } else if (info.offset.x < -threshold) {
            setExitX(-300);
            onSwipe('skip');
        } else if (info.offset.y < -threshold) {
            onSwipe('save');
        }
    };

    const matchScore = job.match_score ? Math.round(job.match_score * 100) : null;
    const matchClass = matchScore >= 70 ? 'match-high' : matchScore >= 40 ? 'match-medium' : 'match-low';

    return (
        <motion.div
            className="absolute w-full"
            style={{
                x,
                rotate: isTop ? rotate : 0,
                opacity,
                zIndex: isTop ? 10 : 1,
            }}
            drag={isTop ? 'x' : false}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.9}
            onDragEnd={handleDragEnd}
            initial={{ scale: isTop ? 1 : 0.95, y: isTop ? 0 : 20 }}
            animate={{ scale: isTop ? 1 : 0.95, y: isTop ? 0 : 20 }}
            exit={{ x: exitX, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
            {/* Swipe indicators */}
            {isTop && (
                <>
                    <motion.div
                        className="absolute top-6 left-6 z-20 px-4 py-2 rounded-lg gradient-danger text-white font-bold text-lg rotate-[-20deg]"
                        style={{ opacity: leftIndicator }}
                    >
                        SKIP
                    </motion.div>
                    <motion.div
                        className="absolute top-6 right-6 z-20 px-4 py-2 rounded-lg gradient-success text-white font-bold text-lg rotate-[20deg]"
                        style={{ opacity: rightIndicator }}
                    >
                        APPLY
                    </motion.div>
                </>
            )}

            {/* Card content */}
            <div className="job-card p-6 cursor-grab active:cursor-grabbing">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center">
                            <Building2 size={28} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white truncate max-w-[200px]">
                                {job.title}
                            </h3>
                            <p className="text-slate-400 flex items-center gap-1">
                                <Building2 size={14} />
                                {job.company}
                            </p>
                        </div>
                    </div>

                    {matchScore && (
                        <div className={`match-badge ${matchClass}`}>
                            <Star size={14} />
                            {matchScore}%
                        </div>
                    )}
                </div>

                {/* Job details */}
                <div className="flex flex-wrap gap-3 mb-4">
                    <span className="flex items-center gap-1 text-sm text-slate-300 bg-slate-700/50 px-3 py-1 rounded-full">
                        <MapPin size={14} />
                        {job.location || 'Remote'}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-slate-300 bg-slate-700/50 px-3 py-1 rounded-full">
                        <Briefcase size={14} />
                        {job.job_type || 'Full-time'}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-slate-300 bg-slate-700/50 px-3 py-1 rounded-full">
                        <Clock size={14} />
                        {job.scraped_at ? 'Recently posted' : 'New'}
                    </span>
                </div>

                {/* Description preview */}
                <p className="text-slate-400 text-sm line-clamp-4 mb-4">
                    {job.description?.slice(0, 300)}
                    {job.description?.length > 300 && '...'}
                </p>

                {/* Skills */}
                {job.matched_skills && job.matched_skills.length > 0 && (
                    <div className="mb-4">
                        <p className="text-xs text-slate-500 mb-2">Matching Skills</p>
                        <div className="flex flex-wrap gap-2">
                            {job.matched_skills.slice(0, 5).map((skill, i) => (
                                <span
                                    key={i}
                                    className="text-xs px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-300"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Source link */}
                <a
                    href={job.apply_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300"
                    onClick={(e) => e.stopPropagation()}
                >
                    <ExternalLink size={14} />
                    View original posting
                </a>
            </div>
        </motion.div>
    );
}

// Card stack component
export function CardStack({ jobs, onSwipe, currentIndex }) {
    const visibleCards = jobs.slice(currentIndex, currentIndex + 3);

    return (
        <div className="relative w-full max-w-md mx-auto h-[500px]">
            <AnimatePresence>
                {visibleCards.map((job, index) => (
                    <SwipeCard
                        key={job.id}
                        job={job}
                        onSwipe={onSwipe}
                        isTop={index === 0}
                    />
                ))}
            </AnimatePresence>

            {visibleCards.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-20 h-20 rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
                        <Briefcase size={40} className="text-slate-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No more jobs!</h3>
                    <p className="text-slate-400">Check back later for new opportunities</p>
                </div>
            )}
        </div>
    );
}

// Swipe action buttons
export function SwipeActions({ onSkip, onSave, onApply, disabled }) {
    return (
        <div className="flex items-center justify-center gap-6 mt-6">
            <button
                onClick={onSkip}
                disabled={disabled}
                className="swipe-btn swipe-btn-skip disabled:opacity-50"
            >
                <X size={28} className="text-white" />
            </button>

            <button
                onClick={onSave}
                disabled={disabled}
                className="swipe-btn swipe-btn-save disabled:opacity-50"
            >
                <Bookmark size={24} className="text-white" />
            </button>

            <button
                onClick={onApply}
                disabled={disabled}
                className="swipe-btn swipe-btn-apply disabled:opacity-50"
            >
                <Check size={28} className="text-white" />
            </button>
        </div>
    );
}
