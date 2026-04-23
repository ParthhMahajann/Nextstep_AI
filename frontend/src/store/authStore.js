/**
 * Auth store using Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI, profileAPI } from '../api/client';

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            profile: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            pendingVerificationEmail: null, // set after signup, cleared on verify

            // Login
            login: async (email, password) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authAPI.login({ username: email, password });
                    localStorage.setItem('access_token', response.data.access);
                    localStorage.setItem('refresh_token', response.data.refresh);

                    // Fetch user profile
                    await get().fetchUser();

                    // Apply profile data saved during the signup wizard, if any.
                    // The wizard stores it in sessionStorage because the user was
                    // inactive (awaiting email verification) at registration time.
                    const pendingRaw = sessionStorage.getItem('pending_profile');
                    if (pendingRaw) {
                        try {
                            const pendingProfile = JSON.parse(pendingRaw);
                            await profileAPI.update(pendingProfile);
                            sessionStorage.removeItem('pending_profile');
                            sessionStorage.removeItem('pending_resume_filename');
                            // Refresh profile state with the newly applied data
                            await get().fetchUser();
                        } catch (profileErr) {
                            // Non-fatal — user can fill in profile manually
                            console.warn('Could not apply pending profile data:', profileErr);
                        }
                    }

                    set({ isAuthenticated: true, isLoading: false, pendingVerificationEmail: null });
                    return true;
                } catch (error) {
                    const detail = error.response?.data?.detail || 'Login failed';
                    const msg = detail.includes('No active account')
                        ? 'Invalid credentials or email not verified yet.'
                        : detail;
                    set({ error: msg, isLoading: false });
                    return false;
                }
            },

            // Register — does NOT auto-login; backend sets user inactive pending email verification
            register: async (userData) => {
                set({ isLoading: true, error: null });
                try {
                    const registrationData = {
                        username: userData.email, // use email as username
                        email: userData.email,
                        password: userData.password,
                        password_confirm: userData.password,
                        first_name: userData.firstName || '',
                        last_name: userData.lastName || '',
                    };
                    await authAPI.register(registrationData);
                    set({
                        isLoading: false,
                        pendingVerificationEmail: userData.email,
                    });
                    return true;
                } catch (error) {
                    set({
                        error: error.response?.data || 'Registration failed',
                        isLoading: false,
                    });
                    return false;
                }
            },

            // Fetch current user
            fetchUser: async () => {
                try {
                    const [userRes, profileRes] = await Promise.all([
                        authAPI.getMe(),
                        profileAPI.get(),
                    ]);
                    set({
                        user: userRes.data,
                        profile: profileRes.data,
                        isAuthenticated: true,
                    });
                } catch {
                    set({ user: null, profile: null, isAuthenticated: false });
                }
            },

            // Update profile
            updateProfile: async (data) => {
                set({ isLoading: true });
                try {
                    let response;
                    if (data instanceof FormData) {
                        response = await profileAPI.updateWithFile(data);
                    } else {
                        response = await profileAPI.update(data);
                    }
                    set({ profile: response.data, isLoading: false });
                    return true;
                } catch (error) {
                    set({
                        error: error.response?.data || 'Update failed',
                        isLoading: false,
                    });
                    return false;
                }
            },

            // Verify email with token
            verifyEmail: async (token) => {
                set({ isLoading: true, error: null });
                try {
                    await authAPI.verifyEmail(token);
                    set({ isLoading: false });
                    return { success: true };
                } catch (error) {
                    const msg = error.response?.data?.detail || 'Verification failed';
                    set({ error: msg, isLoading: false });
                    return { success: false, message: msg };
                }
            },

            // Resend verification email
            resendVerification: async (email) => {
                try {
                    await authAPI.resendVerification(email);
                    return true;
                } catch {
                    return false;
                }
            },

            // Forgot password
            forgotPassword: async (email) => {
                set({ isLoading: true, error: null });
                try {
                    await authAPI.forgotPassword(email);
                    set({ isLoading: false });
                    return true;
                } catch {
                    set({ isLoading: false });
                    return true; // always show success for security
                }
            },

            // Reset password
            resetPassword: async (token, password, passwordConfirm) => {
                set({ isLoading: true, error: null });
                try {
                    await authAPI.resetPassword(token, password, passwordConfirm);
                    set({ isLoading: false });
                    return { success: true };
                } catch (error) {
                    const msg = error.response?.data?.detail
                        || error.response?.data?.password?.[0]
                        || 'Reset failed';
                    set({ error: msg, isLoading: false });
                    return { success: false, message: msg };
                }
            },

            // Logout
            logout: async () => {
                try {
                    const refresh = localStorage.getItem('refresh_token');
                    if (refresh) {
                        await authAPI.logout({ refresh });
                    }
                } catch (_) {
                    // Silently ignore — always clear local state
                } finally {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    set({
                        user: null,
                        profile: null,
                        isAuthenticated: false,
                        error: null,
                        pendingVerificationEmail: null,
                    });
                }
            },

            // Clear error
            clearError: () => set({ error: null }),
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                pendingVerificationEmail: state.pendingVerificationEmail,
            }),
        }
    )
);
