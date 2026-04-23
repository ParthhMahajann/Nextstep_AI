/**
 * Jobs store using Zustand
 */

import { create } from 'zustand';
import { jobsAPI, savedJobsAPI } from '../api/client';

export const useJobsStore = create((set, get) => ({
    jobs: [],
    currentIndex: 0,
    savedJobs: [],
    appliedJobs: [],
    isLoading: false,
    error: null,
    filters: {},

    setFilters: (filters) => set({ filters }),

    // Fetch recommended jobs (with optional filters)
    fetchRecommended: async () => {
        set({ isLoading: true, error: null });
        try {
            const { filters } = get();
            const params = {};
            if (filters.job_type) params.job_type = filters.job_type;
            if (filters.experience_level) params.experience_level = filters.experience_level;
            if (filters.location) params.location = filters.location;
            if (filters.remote) params.remote = 'true';
            const response = await jobsAPI.recommended(params);
            set({
                jobs: response.data.results || response.data,
                currentIndex: 0,
                isLoading: false
            });
        } catch (error) {
            set({
                error: error.response?.data || 'Failed to fetch jobs',
                isLoading: false
            });
        }
    },

    // Get current job card
    getCurrentJob: () => {
        const { jobs, currentIndex } = get();
        return jobs[currentIndex] || null;
    },

    // Skip job (swipe left)
    skipJob: () => {
        const { currentIndex, jobs } = get();
        const currentJob = jobs[currentIndex];
        if (currentJob?.id) {
            jobsAPI.skip(currentJob.id, currentIndex).catch(() => {});
        }
        if (currentIndex < jobs.length - 1) {
            set({ currentIndex: currentIndex + 1 });
        }
    },

    // Save job (swipe up)
    saveJob: async (job) => {
        try {
            await savedJobsAPI.save({ job: job.id, status: 'saved' });
            set((state) => ({
                // Avoid duplicate entries in local state
                savedJobs: state.savedJobs.some(j => (j.job?.id ?? j.id) === job.id)
                    ? state.savedJobs
                    : [...state.savedJobs, { job, status: 'saved' }],
                currentIndex: state.currentIndex + 1,
            }));
        } catch (error) {
            console.error('Failed to save job:', error);
            // Still advance the card so the user isn't stuck
            set((state) => ({ currentIndex: state.currentIndex + 1 }));
        }
    },

    // Apply to job (swipe right)
    applyToJob: async (job) => {
        try {
            await savedJobsAPI.save({ job: job.id, status: 'applied' });
            set((state) => ({
                // Remove from savedJobs if it was there, add to appliedJobs
                savedJobs: state.savedJobs.filter(j => (j.job?.id ?? j.id) !== job.id),
                appliedJobs: state.appliedJobs.some(j => (j.job?.id ?? j.id) === job.id)
                    ? state.appliedJobs
                    : [...state.appliedJobs, { job, status: 'applied' }],
                currentIndex: state.currentIndex + 1,
            }));
            return true;
        } catch (error) {
            console.error('Failed to apply:', error);
            set((state) => ({ currentIndex: state.currentIndex + 1 }));
            return false;
        }
    },

    // Fetch saved jobs — handles both paginated {results:[]} and plain [] responses
    fetchSavedJobs: async () => {
        try {
            const response = await savedJobsAPI.list({ page_size: 200 });
            const all = Array.isArray(response.data)
                ? response.data
                : (response.data.results || []);
            const saved = all.filter(j => j.status === 'saved');
            const applied = all.filter(j => j.status !== 'saved');
            set({ savedJobs: saved, appliedJobs: applied, allSavedJobs: all });
        } catch (error) {
            console.error('Failed to fetch saved jobs:', error);
        }
    },

    allSavedJobs: [],

    // Check if more jobs available
    hasMoreJobs: () => {
        const { currentIndex, jobs } = get();
        return currentIndex < jobs.length;
    },
}));
