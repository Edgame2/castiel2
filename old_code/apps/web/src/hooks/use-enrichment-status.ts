import { useEffect, useState, useCallback } from 'react';
import { useRealtime } from '@/components/providers/realtime-provider';

export interface EnrichmentJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  totalRecords?: number;
  processedRecords?: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface EnrichmentEvent {
  jobId: string;
  status: 'started' | 'progress' | 'completed' | 'failed';
  progress?: number;
  totalRecords?: number;
  processedRecords?: number;
  timestamp: string;
  error?: string;
}

/**
 * Hook for tracking enrichment job status in real-time
 * Subscribes to enrichment events and maintains job state
 */
export function useEnrichmentStatus(jobId?: string) {
  const { subscribe, unsubscribe, isConnected, connectionType } = useRealtime();
  const [jobs, setJobs] = useState<Map<string, EnrichmentJob>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get specific job by ID
  const getJob = useCallback(
    (id: string): EnrichmentJob | undefined => {
      return jobs.get(id);
    },
    [jobs]
  );

  // Get all jobs
  const getAllJobs = useCallback((): EnrichmentJob[] => {
    return Array.from(jobs.values());
  }, [jobs]);

  // Get jobs by status
  const getJobsByStatus = useCallback(
    (status: EnrichmentJob['status']): EnrichmentJob[] => {
      return Array.from(jobs.values()).filter((job) => job.status === status);
    },
    [jobs]
  );

  // Update job state based on event
  const handleEnrichmentEvent = useCallback((event: EnrichmentEvent) => {
    setJobs((prevJobs) => {
      const newJobs = new Map(prevJobs);
      const existingJob = newJobs.get(event.jobId);

      switch (event.status) {
        case 'started':
          newJobs.set(event.jobId, {
            id: event.jobId,
            status: 'running',
            progress: 0,
            totalRecords: event.totalRecords,
            processedRecords: 0,
            startedAt: event.timestamp,
          });
          break;

        case 'progress':
          if (existingJob) {
            newJobs.set(event.jobId, {
              ...existingJob,
              progress: event.progress,
              processedRecords: event.processedRecords,
            });
          }
          break;

        case 'completed':
          if (existingJob) {
            newJobs.set(event.jobId, {
              ...existingJob,
              status: 'completed',
              progress: 100,
              processedRecords: existingJob.totalRecords,
              completedAt: event.timestamp,
            });
          }
          break;

        case 'failed':
          if (existingJob) {
            newJobs.set(event.jobId, {
              ...existingJob,
              status: 'failed',
              completedAt: event.timestamp,
              error: event.error,
            });
          }
          break;
      }

      return newJobs;
    });
  }, []);

  // Subscribe to enrichment events
  useEffect(() => {
    if (!isConnected) {
      setLoading(true);
      return;
    }

    setLoading(false);

    // Subscribe to all enrichment event types
    const eventTypes = [
      'enrichment.started',
      'enrichment.progress',
      'enrichment.completed',
      'enrichment.failed',
    ] as const;

    eventTypes.forEach((eventType) => {
      subscribe(eventType, handleEnrichmentEvent);
    });

    return () => {
      eventTypes.forEach((eventType) => {
        unsubscribe(eventType, handleEnrichmentEvent);
      });
    };
  }, [isConnected, subscribe, unsubscribe, handleEnrichmentEvent]);

  // Clear error when connection is restored
  useEffect(() => {
    if (isConnected && error) {
      setError(null);
    }
  }, [isConnected, error]);

  return {
    // Job queries
    getJob,
    getAllJobs,
    getJobsByStatus,
    
    // Specific job (if jobId provided)
    job: jobId ? getJob(jobId) : undefined,
    
    // Connection state
    isConnected,
    connectionType,
    loading,
    error,
    
    // Metrics
    totalJobs: jobs.size,
    runningJobs: getJobsByStatus('running').length,
    completedJobs: getJobsByStatus('completed').length,
    failedJobs: getJobsByStatus('failed').length,
  };
}
