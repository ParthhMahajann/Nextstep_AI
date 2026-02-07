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

            // Login
            login: async (email, password) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authAPI.login({ username: email, password });
                    localStorage.setItem('access_token', response.data.access);
                    localStorage.setItem('refresh_token', response.data.refresh);

                    // Fetch user profile
                    await get().fetchUser();

                    set({ isAuthenticated: true, isLoading: false });
                    return true;
                } catch (error) {
                    set({
                        error: error.response?.data?.detail || 'Login failed',
                        isLoading: false
                    });
                    return false;
                }
            },

            // Register
            register: async (userData) => {
                set({ isLoading: true, error: null });
                try {
                    // Add password_confirm field required by backend
                    const registrationData = {
                        ...userData,
                        password_confirm: userData.password,
                    };
                    await authAPI.register(registrationData);
                    // Auto-login after register
                    return await get().login(userData.email, userData.password);
                } catch (error) {
                    set({
                        error: error.response?.data || 'Registration failed',
                        isLoading: false
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
                        isAuthenticated: true
                    });
                } catch {
                    set({ user: null, profile: null, isAuthenticated: false });
                }
            },

            // Update profile
            updateProfile: async (data) => {
                set({ isLoading: true });
                try {
                    const response = await profileAPI.update(data);
                    set({ profile: response.data, isLoading: false });
                    return true;
                } catch (error) {
                    set({
                        error: error.response?.data || 'Update failed',
                        isLoading: false
                    });
                    return false;
                }
            },

            // Logout
            logout: () => {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                set({
                    user: null,
                    profile: null,
                    isAuthenticated: false,
                    error: null
                });
            },

            // Clear error
            clearError: () => set({ error: null }),
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated
            }),
        }
    )
);
