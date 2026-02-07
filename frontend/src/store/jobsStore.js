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

    // Fetch recommended jobs
    fetchRecommended: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await jobsAPI.recommended();
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
        if (currentIndex < jobs.length - 1) {
            set({ currentIndex: currentIndex + 1 });
        }
    },

    // Save job (swipe up)
    saveJob: async (job) => {
        try {
            await savedJobsAPI.save({
                job: job.id,
                status: 'saved'
            });
            set((state) => ({
                savedJobs: [...state.savedJobs, job],
                currentIndex: state.currentIndex + 1,
            }));
        } catch (error) {
            console.error('Failed to save job:', error);
        }
    },

    // Apply to job (swipe right)
    applyToJob: async (job) => {
        try {
            await savedJobsAPI.save({
                job: job.id,
                status: 'applied'
            });
            set((state) => ({
                appliedJobs: [...state.appliedJobs, job],
                currentIndex: state.currentIndex + 1,
            }));
            return true;
        } catch (error) {
            console.error('Failed to apply:', error);
            return false;
        }
    },

    // Fetch saved jobs
    fetchSavedJobs: async () => {
        try {
            const response = await savedJobsAPI.list();
            const saved = response.data.filter(j => j.status === 'saved');
            const applied = response.data.filter(j => j.status === 'applied');
            set({ savedJobs: saved, appliedJobs: applied });
        } catch (error) {
            console.error('Failed to fetch saved jobs:', error);
        }
    },

    // Check if more jobs available
    hasMoreJobs: () => {
        const { currentIndex, jobs } = get();
        return currentIndex < jobs.length;
    },
}));
