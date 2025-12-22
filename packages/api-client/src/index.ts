/**
 * @askmerve/api-client
 *
 * Shared HTTP client for AskMerve web and mobile applications.
 *
 * Usage:
 * ```typescript
 * import { HttpClient, JobsApi, LocalStorageAdapter } from '@askmerve/api-client';
 *
 * const client = new HttpClient({
 *   baseUrl: 'https://api.askmerve.app',
 *   storage: new LocalStorageAdapter(),
 *   getAuthToken: () => firebase.auth().currentUser?.getIdToken(),
 * });
 *
 * const jobsApi = new JobsApi(client);
 * const job = await jobsApi.createJob({ actionType: 'taxi', actionData: {...} });
 * ```
 */

// Storage
export {
    StorageAdapter,
    LocalStorageAdapter,
    InMemoryStorageAdapter,
} from './storage';

// HTTP Client
export {
    HttpClient,
    HttpClientConfig,
    ApiResponse,
    ApiError,
} from './client';

// Endpoints
export {
    JobsApi,
    ChatApi,
    CreateJobRequest,
    ConfirmJobRequest,
    ChatResponse,
    SendMessageRequest,
} from './endpoints';

// Re-export types from shared for convenience
export type {
    Job,
    JobStatus,
    CreateJobInput,
    ActionType,
    ActionData,
    MerchantTarget,
} from '@askmerve/shared';
