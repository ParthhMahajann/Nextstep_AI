/**
 * Login page component
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, isLoading, error, clearError } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        clearError();
        const success = await login(email, password);
        if (success) {
            navigate('/discover');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4">
                        <Briefcase size={32} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">NextStep AI</h1>
                    <p className="text-slate-400 mt-2">Find your perfect opportunity</p>
                </div>

                {/* Login form */}
                <div className="glass rounded-2xl p-8">
                    <h2 className="text-2xl font-bold mb-6 text-center">Welcome back</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                            <input
                                type="email"
                                placeholder="Email"
                                className="input pl-12"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                            <input
                                type="password"
                                placeholder="Password"
                                className="input pl-12"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">
                                {typeof error === 'string' ? error : 'Invalid credentials'}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-primary w-full"
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                            <ArrowRight size={20} />
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-slate-400">
                            Don't have an account?{' '}
                            <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
