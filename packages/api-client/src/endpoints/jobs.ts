/**
 * Jobs API Endpoints
 *
 * Typed wrapper for /v1/jobs/* endpoints.
 * Matches backend contracts in functions/src/http/v1/jobs/
 */

import type { HttpClient, ApiResponse } from '../client';
import type {
    Job,
    CreateJobInput,
    ActionType,
    ActionData,
} from '@askmerve/shared';

// =============================================================================
// REQUEST/RESPONSE TYPES
// =============================================================================

/**
 * Request body for creating a job.
 * Matches CreateJobRequestSchema in functions.
 */
export interface CreateJobRequest {
    actionType: ActionType;
    actionData: ActionData;
    language?: 'en' | 'tr' | 'ru';
    clientRequestId?: string;
    conversationId?: string;
}

/**
 * Request body for confirming a job.
 * Matches ConfirmJobRequestSchema in functions.
 */
export interface ConfirmJobRequest {
    note?: string;
}

// =============================================================================
// JOBS API
// =============================================================================

export class JobsApi {
    constructor(private readonly client: HttpClient) { }

    /**
     * Create a new job in 'collecting' status.
     *
     * @param data - Job creation data
     * @param clientRequestId - Optional idempotency key
     */
    async createJob(
        data: CreateJobRequest,
        clientRequestId?: string
    ): Promise<Job> {
        const response = await this.client.post<Job>('/jobs', {
            ...data,
            clientRequestId: clientRequestId ?? generateClientRequestId(),
        });

        if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to create job');
        }

        return response.data;
    }

    /**
     * Confirm a job, transitioning it from 'collecting' to 'confirming'.
     *
     * @param jobId - ID of the job to confirm
     * @param note - Optional note from user
     */
    async confirmJob(jobId: string, note?: string): Promise<Job> {
        const body: ConfirmJobRequest | undefined = note ? { note } : undefined;
        const response = await this.client.post<Job>(`/jobs/${jobId}/confirm`, body);

        if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to confirm job');
        }

        return response.data;
    }

    /**
     * Get a job by ID.
     *
     * @param jobId - ID of the job to fetch
     */
    async getJob(jobId: string): Promise<Job> {
        const response = await this.client.get<Job>(`/jobs/${jobId}`);

        if (!response.success || !response.data) {
            throw new Error(response.error || 'Job not found');
        }

        return response.data;
    }

    /**
     * Get all jobs for the current user.
     * Note: This endpoint may not exist yet - check backend.
     */
    async getMyJobs(): Promise<Job[]> {
        const response = await this.client.get<Job[]>('/jobs');

        if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to fetch jobs');
        }

        return response.data;
    }

    /**
     * Dispatch a job to the merchant.
     * Sends notification via WhatsApp/Push based on channel availability.
     *
     * @param jobId - ID of the job to dispatch
     */
    async dispatchJob(jobId: string): Promise<Job> {
        const response = await this.client.post<Job>(`/jobs/${jobId}/dispatch`);

        if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to dispatch job');
        }

        return response.data;
    }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Generate a unique client request ID for idempotency.
 */
function generateClientRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${random}`;
}
