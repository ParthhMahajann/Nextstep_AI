/**
 * Multi-step signup component
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    GraduationCap,
    Lightbulb,
    Briefcase,
    Settings,
    FileText,
    ChevronRight,
    ChevronLeft,
    Check
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const STEPS = [
    { id: 1, title: 'Basic Info', icon: User },
    { id: 2, title: 'Education', icon: GraduationCap },
    { id: 3, title: 'Skills', icon: Lightbulb },
    { id: 4, title: 'Experience', icon: Briefcase },
    { id: 5, title: 'Preferences', icon: Settings },
    { id: 6, title: 'Resume', icon: FileText },
];

const JOB_TYPES = ['Internship', 'Full-time', 'Part-time', 'Freelance', 'Contract'];
const LOCATIONS = ['Remote', 'Mumbai', 'Bangalore', 'Delhi', 'Hyderabad', 'Pune', 'Chennai'];

const SKILL_OPTIONS = [
    'JavaScript', 'Python', 'React', 'Node.js', 'Java', 'C++',
    'Machine Learning', 'Data Science', 'UI/UX Design', 'Figma',
    'SQL', 'MongoDB', 'AWS', 'Docker', 'Git', 'TypeScript',
    'Flutter', 'React Native', 'Django', 'FastAPI', 'PostgreSQL'
];

export function SignupWizard({ onComplete }) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        // Step 1: Basic
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        // Step 2: Education
        degree: '',
        field: '',
        institution: '',
        graduationYear: '',
        status: 'student',
        // Step 3: Skills
        skills: [],
        // Step 4: Experience
        bio: '',
        portfolioUrl: '',
        linkedinUrl: '',
        // Step 5: Preferences
        preferredJobTypes: [],
        preferredLocations: [],
        // Step 6: Resume
        resumeText: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const { register, updateProfile } = useAuthStore();

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleArrayItem = (field, item) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].includes(item)
                ? prev[field].filter(i => i !== item)
                : [...prev[field], item]
        }));
    };

    const handleNext = () => {
        if (step < 6) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Register user
            const success = await register({
                username: formData.email,
                email: formData.email,
                password: formData.password,
                first_name: formData.firstName,
                last_name: formData.lastName,
            });

            if (!success) {
                throw new Error('Registration failed');
            }

            // Update profile with additional info
            await updateProfile({
                bio: formData.bio,
                preferred_job_types: formData.preferredJobTypes,
                preferred_locations: formData.preferredLocations,
                resume_text: formData.resumeText,
            });

            onComplete?.();
        } catch (err) {
            setError(err.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                {/* Progress bar */}
                <div className="mb-8">
                    <div className="flex justify-between mb-2">
                        {STEPS.map((s) => (
                            <div
                                key={s.id}
                                className={`flex flex-col items-center ${s.id <= step ? 'text-indigo-400' : 'text-slate-600'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${s.id < step ? 'gradient-primary' :
                                        s.id === step ? 'border-2 border-indigo-500 bg-indigo-500/20' :
                                            'border-2 border-slate-600'
                                    }`}>
                                    {s.id < step ? <Check size={20} /> : <s.icon size={18} />}
                                </div>
                                <span className="text-xs hidden sm:block">{s.title}</span>
                            </div>
                        ))}
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full gradient-primary transition-all duration-300"
                            style={{ width: `${(step / 6) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Form card */}
                <div className="glass rounded-2xl p-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Step 1: Basic Info */}
                            {step === 1 && (
                                <div>
                                    <h2 className="text-2xl font-bold mb-6">Let's get started</h2>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <input
                                                type="text"
                                                placeholder="First Name"
                                                className="input"
                                                value={formData.firstName}
                                                onChange={(e) => updateField('firstName', e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Last Name"
                                                className="input"
                                                value={formData.lastName}
                                                onChange={(e) => updateField('lastName', e.target.value)}
                                            />
                                        </div>
                                        <input
                                            type="email"
                                            placeholder="Email"
                                            className="input"
                                            value={formData.email}
                                            onChange={(e) => updateField('email', e.target.value)}
                                        />
                                        <input
                                            type="password"
                                            placeholder="Password"
                                            className="input"
                                            value={formData.password}
                                            onChange={(e) => updateField('password', e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Education */}
                            {step === 2 && (
                                <div>
                                    <h2 className="text-2xl font-bold mb-6">Your Education</h2>
                                    <div className="space-y-4">
                                        <select
                                            className="input"
                                            value={formData.degree}
                                            onChange={(e) => updateField('degree', e.target.value)}
                                        >
                                            <option value="">Select Degree</option>
                                            <option value="btech">B.Tech / B.E.</option>
                                            <option value="bsc">B.Sc</option>
                                            <option value="bca">BCA</option>
                                            <option value="mtech">M.Tech</option>
                                            <option value="mba">MBA</option>
                                            <option value="other">Other</option>
                                        </select>
                                        <input
                                            type="text"
                                            placeholder="Field of Study (e.g., Computer Science)"
                                            className="input"
                                            value={formData.field}
                                            onChange={(e) => updateField('field', e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Institution Name"
                                            className="input"
                                            value={formData.institution}
                                            onChange={(e) => updateField('institution', e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Graduation Year"
                                            className="input"
                                            value={formData.graduationYear}
                                            onChange={(e) => updateField('graduationYear', e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Skills */}
                            {step === 3 && (
                                <div>
                                    <h2 className="text-2xl font-bold mb-2">Your Skills</h2>
                                    <p className="text-slate-400 mb-6">Select your top skills (max 10)</p>
                                    <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto">
                                        {SKILL_OPTIONS.map((skill) => (
                                            <button
                                                key={skill}
                                                onClick={() => toggleArrayItem('skills', skill)}
                                                disabled={!formData.skills.includes(skill) && formData.skills.length >= 10}
                                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${formData.skills.includes(skill)
                                                        ? 'gradient-primary text-white'
                                                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                                                    } disabled:opacity-30`}
                                            >
                                                {skill}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-sm text-slate-500 mt-4">
                                        {formData.skills.length}/10 selected
                                    </p>
                                </div>
                            )}

                            {/* Step 4: Experience */}
                            {step === 4 && (
                                <div>
                                    <h2 className="text-2xl font-bold mb-6">Tell us about yourself</h2>
                                    <div className="space-y-4">
                                        <textarea
                                            placeholder="Brief bio / summary (what you're looking for)"
                                            className="input h-32 resize-none"
                                            value={formData.bio}
                                            onChange={(e) => updateField('bio', e.target.value)}
                                        />
                                        <input
                                            type="url"
                                            placeholder="Portfolio URL (optional)"
                                            className="input"
                                            value={formData.portfolioUrl}
                                            onChange={(e) => updateField('portfolioUrl', e.target.value)}
                                        />
                                        <input
                                            type="url"
                                            placeholder="LinkedIn URL (optional)"
                                            className="input"
                                            value={formData.linkedinUrl}
                                            onChange={(e) => updateField('linkedinUrl', e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 5: Preferences */}
                            {step === 5 && (
                                <div>
                                    <h2 className="text-2xl font-bold mb-6">Job Preferences</h2>
                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-sm text-slate-400 mb-3">What type of work are you looking for?</p>
                                            <div className="flex flex-wrap gap-2">
                                                {JOB_TYPES.map((type) => (
                                                    <button
                                                        key={type}
                                                        onClick={() => toggleArrayItem('preferredJobTypes', type.toLowerCase())}
                                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${formData.preferredJobTypes.includes(type.toLowerCase())
                                                                ? 'gradient-primary text-white'
                                                                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                                                            }`}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-400 mb-3">Preferred locations</p>
                                            <div className="flex flex-wrap gap-2">
                                                {LOCATIONS.map((loc) => (
                                                    <button
                                                        key={loc}
                                                        onClick={() => toggleArrayItem('preferredLocations', loc)}
                                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${formData.preferredLocations.includes(loc)
                                                                ? 'gradient-primary text-white'
                                                                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                                                            }`}
                                                    >
                                                        {loc}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 6: Resume */}
                            {step === 6 && (
                                <div>
                                    <h2 className="text-2xl font-bold mb-2">Your Resume</h2>
                                    <p className="text-slate-400 mb-6">Paste your resume text for AI-powered matching</p>
                                    <textarea
                                        placeholder="Paste your resume content here..."
                                        className="input h-48 resize-none font-mono text-sm"
                                        value={formData.resumeText}
                                        onChange={(e) => updateField('resumeText', e.target.value)}
                                    />
                                    <p className="text-xs text-slate-500 mt-2">
                                        This helps us find the best matches for you
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Error message */}
                    {error && (
                        <div className="mt-4 p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Navigation buttons */}
                    <div className="flex justify-between mt-8">
                        <button
                            onClick={handleBack}
                            disabled={step === 1}
                            className="btn btn-outline disabled:opacity-30"
                        >
                            <ChevronLeft size={20} />
                            Back
                        </button>

                        {step < 6 ? (
                            <button onClick={handleNext} className="btn btn-primary">
                                Next
                                <ChevronRight size={20} />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="btn btn-primary"
                            >
                                {isLoading ? 'Creating...' : 'Complete Setup'}
                                <Check size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
