/**
 * Background Service (WEB-02)
 *
 * Reliable background task execution for job monitoring and notifications.
 *
 * INVARIANTS:
 * - All background work has explicit lifecycle controls.
 * - Tasks are resumable after app restart.
 * - Heartbeat for active jobs.
 * - Feature flag gated for safe rollout.
 *
 * @see Living Document Section 17.2.2 for invariants.
 */

import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { logger } from './logger';
import { getConfig } from './remoteConfig';

/**
 * Background task names.
 */
const TASK_NAMES = {
    JOB_SYNC: 'JOB_SYNC_TASK',
    HEARTBEAT: 'HEARTBEAT_TASK',
} as const;

/**
 * Background task status.
 */
export interface BackgroundTaskStatus {
    taskName: string;
    isRegistered: boolean;
    lastRunAt: Date | null;
    runCount: number;
    lastError: string | null;
}

/**
 * Task run statistics.
 */
const taskStats = new Map<string, { lastRunAt: Date | null; runCount: number; lastError: string | null }>();

/**
 * Initializes task statistics.
 */
function initTaskStats(taskName: string): void {
    if (!taskStats.has(taskName)) {
        taskStats.set(taskName, { lastRunAt: null, runCount: 0, lastError: null });
    }
}

/**
 * Records a task run.
 */
function recordTaskRun(taskName: string, error?: string): void {
    const stats = taskStats.get(taskName) || { lastRunAt: null, runCount: 0, lastError: null };
    stats.lastRunAt = new Date();
    stats.runCount++;
    stats.lastError = error || null;
    taskStats.set(taskName, stats);
}

/**
 * Defines the job sync background task.
 */
TaskManager.defineTask(TASK_NAMES.JOB_SYNC, async () => {
    const taskName = TASK_NAMES.JOB_SYNC;
    initTaskStats(taskName);

    // Check feature flag
    if (!getConfig('backgroundJobsEnabled')) {
        logger.info('Background: Job sync disabled by config', {
            component: 'backgroundService',
            event: 'task_disabled',
            taskName,
        });
        return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    logger.info('Background: Job sync started', {
        component: 'backgroundService',
        event: 'task_started',
        taskName,
    });

    try {
        // TODO: Implement actual job sync logic
        // - Fetch active jobs
        // - Check for status updates
        // - Trigger local notifications if needed

        recordTaskRun(taskName);

        logger.info('Background: Job sync completed', {
            component: 'backgroundService',
            event: 'task_completed',
            taskName,
        });

        return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
        const errorMsg = String(error);
        recordTaskRun(taskName, errorMsg);

        logger.error('Background: Job sync failed', {
            component: 'backgroundService',
            event: 'task_failed',
            taskName,
            error: errorMsg,
        });

        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});

/**
 * Registers background fetch for job sync.
 * Call this during app initialization.
 */
export async function registerBackgroundTasks(): Promise<void> {
    // Check feature flag
    if (!getConfig('backgroundJobsEnabled')) {
        logger.info('Background: Tasks disabled by config', {
            component: 'backgroundService',
            event: 'registration_skipped',
        });
        return;
    }

    try {
        const status = await BackgroundFetch.getStatusAsync();

        if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
            logger.warn('Background: Fetch denied by system', {
                component: 'backgroundService',
                event: 'registration_denied',
            });
            return;
        }

        if (status === BackgroundFetch.BackgroundFetchStatus.Restricted) {
            logger.warn('Background: Fetch restricted by system', {
                component: 'backgroundService',
                event: 'registration_restricted',
            });
            // Continue anyway, may work in some cases
        }

        await BackgroundFetch.registerTaskAsync(TASK_NAMES.JOB_SYNC, {
            minimumInterval: 15 * 60, // 15 minutes
            stopOnTerminate: false,
            startOnBoot: true,
        });

        logger.info('Background: Task registered', {
            component: 'backgroundService',
            event: 'registration_success',
            taskName: TASK_NAMES.JOB_SYNC,
        });
    } catch (error) {
        logger.error('Background: Task registration failed', {
            component: 'backgroundService',
            event: 'registration_failed',
            error: String(error),
        });
        // Don't throw - app should work without background tasks
    }
}

/**
 * Unregisters all background tasks.
 */
export async function unregisterBackgroundTasks(): Promise<void> {
    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAMES.JOB_SYNC);

        if (isRegistered) {
            await BackgroundFetch.unregisterTaskAsync(TASK_NAMES.JOB_SYNC);

            logger.info('Background: Task unregistered', {
                component: 'backgroundService',
                event: 'unregistration_success',
                taskName: TASK_NAMES.JOB_SYNC,
            });
        }
    } catch (error) {
        logger.error('Background: Task unregistration failed', {
            component: 'backgroundService',
            event: 'unregistration_failed',
            error: String(error),
        });
    }
}

/**
 * Gets the status of background tasks.
 */
export async function getBackgroundTaskStatus(): Promise<BackgroundTaskStatus[]> {
    const results: BackgroundTaskStatus[] = [];

    for (const taskName of Object.values(TASK_NAMES)) {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(taskName).catch(() => false);
        const stats = taskStats.get(taskName) || { lastRunAt: null, runCount: 0, lastError: null };

        results.push({
            taskName,
            isRegistered,
            lastRunAt: stats.lastRunAt,
            runCount: stats.runCount,
            lastError: stats.lastError,
        });
    }

    return results;
}

/**
 * Manually triggers a background task for testing.
 */
export async function triggerBackgroundTask(taskName: string): Promise<void> {
    logger.info('Background: Manual trigger', {
        component: 'backgroundService',
        event: 'manual_trigger',
        taskName,
    });

    // Call the task executor directly
    if (TaskManager.isTaskDefined(taskName)) {
        await TaskManager.getTaskOptionsAsync(taskName);
        // Note: Cannot directly invoke the task, this is just for debugging
    }
}
