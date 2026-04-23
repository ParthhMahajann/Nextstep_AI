/**
 * API client for NextStep AI backend
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

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

// Token refresh mutex — prevents simultaneous refresh races with ROTATE_REFRESH_TOKENS=True
let _refreshPromise = null;

async function refreshAccessToken() {
    // If a refresh is already in flight, wait for it rather than sending a second one.
    if (_refreshPromise) return _refreshPromise;

    _refreshPromise = (async () => {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(`${API_BASE}/auth/refresh/`, { refresh: refreshToken });
        const newAccess = response.data.access;
        localStorage.setItem('access_token', newAccess);
        if (response.data.refresh) {
            localStorage.setItem('refresh_token', response.data.refresh);
        }
        return newAccess;
    })();

    try {
        return await _refreshPromise;
    } finally {
        _refreshPromise = null;
    }
}

// Handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const newAccess = await refreshAccessToken();
                originalRequest.headers.Authorization = `Bearer ${newAccess}`;
                return api(originalRequest);
            } catch {
                // Refresh failed — clear tokens and redirect to login
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
                return Promise.reject(error);
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
    verifyEmail: (token) => api.post('/auth/verify-email/', { token }),
    resendVerification: (email) => api.post('/auth/resend-verification/', { email }),
    forgotPassword: (email) => api.post('/auth/password-reset/', { email }),
    resetPassword: (token, password, password_confirm) =>
        api.post('/auth/password-reset/confirm/', { token, password, password_confirm }),
    logout: (data) => api.post('/auth/logout/', data),
};

// Profile API
export const profileAPI = {
    get: () => api.get('/profile/'),
    update: (data) => api.patch('/profile/', data),
    updateWithFile: (formData) =>
        api.patch('/profile/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    getSkillSuggestions: () => api.get('/users/me/skill-suggestions/'),
    getTasteProfile: () => api.get('/users/me/taste-profile/'),
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
    recommended: (params) => api.get('/jobs/recommended/', { params }),
    matchScore: (id) => api.get(`/jobs/${id}/match_score/`),
    skillGap: (id) => api.get(`/jobs/${id}/skill_gap/`),
    skip: (id, cardPosition = 0) => api.post(`/jobs/${id}/skip/`, { card_position: cardPosition }),
    similar: (id) => api.get(`/jobs/${id}/similar/`),
};

// Saved Jobs API
export const savedJobsAPI = {
    list: (params) => api.get('/saved-jobs/', { params }),
    save: (data) => api.post('/saved-jobs/', data),
    update: (id, data) => api.patch(`/saved-jobs/${id}/`, data),
    delete: (id) => api.delete(`/saved-jobs/${id}/`),
    analytics: () => api.get('/saved-jobs/analytics/'),
};

// Resume Versions API
export const resumeVersionsAPI = {
    list: () => api.get('/resume-versions/'),
    get: (id) => api.get(`/resume-versions/${id}/`),
    create: (data) => api.post('/resume-versions/', data),
    update: (id, data) => api.patch(`/resume-versions/${id}/`, data),
    delete: (id) => api.delete(`/resume-versions/${id}/`),
};

// AI API
export const aiAPI = {
    generateEmail: (data) => api.post('/ai/generate-email/', data),
    analyzeResume: (data) => {
        if (data instanceof FormData) {
            return api.post('/ai/analyze-resume/', data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        }
        return api.post('/ai/analyze-resume/', data);
    },
    generateCoverLetter: (data) => api.post('/ai/cover-letter/', data),
    getApplicationTips: (data) => api.post('/ai/application-tips/', data),
    interviewPrep: (data) => api.post('/ai/interview-prep/', data),
    tailorResume: (data) => api.post('/ai/tailor-resume/', data),
    companyResearch: (data) => api.post('/ai/company-research/', data),
    chat: (data) => api.post('/ai/chat/', data),
};

export default api;
