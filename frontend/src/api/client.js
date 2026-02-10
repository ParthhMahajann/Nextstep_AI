/**
 * API client for NextStep AI backend
 */

import axios from 'axios';

const API_BASE = '/api';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                try {
                    const response = await axios.post(`${API_BASE}/auth/refresh/`, {
                        refresh: refreshToken,
                    });

                    localStorage.setItem('access_token', response.data.access);
                    originalRequest.headers.Authorization = `Bearer ${response.data.access}`;

                    return api(originalRequest);
                } catch {
                    // Refresh failed, logout
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    window.location.href = '/login';
                }
            }
        }

        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    register: (data) => api.post('/auth/register/', data),
    login: (data) => api.post('/auth/login/', data),
    getMe: () => api.get('/auth/me/'),
    refreshToken: (refresh) => api.post('/auth/refresh/', { refresh }),
};

// Profile API
export const profileAPI = {
    get: () => api.get('/profile/'),
    update: (data) => api.patch('/profile/', data),
};

// Skills API
export const skillsAPI = {
    list: () => api.get('/skills/'),
    getUserSkills: () => api.get('/user-skills/'),
    addSkill: (data) => api.post('/user-skills/', data),
    removeSkill: (id) => api.delete(`/user-skills/${id}/`),
};

// Jobs API
export const jobsAPI = {
    list: (params) => api.get('/jobs/', { params }),
    get: (id) => api.get(`/jobs/${id}/`),
    recommended: () => api.get('/jobs/recommended/'),
    matchScore: (id) => api.get(`/jobs/${id}/match_score/`),
};

// Saved Jobs API
export const savedJobsAPI = {
    list: () => api.get('/saved-jobs/'),
    save: (data) => api.post('/saved-jobs/', data),
    update: (id, data) => api.patch(`/saved-jobs/${id}/`, data),
    delete: (id) => api.delete(`/saved-jobs/${id}/`),
};

// AI API
export const aiAPI = {
    generateEmail: (data) => api.post('/ai/generate-email/', data),
    analyzeResume: (data) => {
        // If data is FormData (file upload), let browser set Content-Type
        if (data instanceof FormData) {
            return api.post('/ai/analyze-resume/', data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        }
        return api.post('/ai/analyze-resume/', data);
    },
    generateCoverLetter: (data) => api.post('/ai/cover-letter/', data),
    getApplicationTips: (data) => api.post('/ai/application-tips/', data),
};

export default api;
