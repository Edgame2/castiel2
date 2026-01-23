# BullMQ Performance Optimization Plan

**Date:** 2025-01-XX  
**Status:** Implementation In Progress

---

## Executive Summary

This document outlines the optimization plan for BullMQ queues to improve performance, reduce resource usage, and ensure scalability. The optimizations focus on rate limiting, connection pooling, job serialization, and concurrency tuning.

---

## Current State Analysis

### Queue Characteristics

1. **High-Volume Queues:**
   - `sync-inbound-webhook` - Concurrency: 10, High burst potential
   - `embedding-jobs` - Concurrency: 5, Steady volume
   - `sync-inbound-scheduled` - Concurrency: 5, Scheduled batches

2. **Current Configuration:**
   - Default concurrency: 5
   - No rate limiters
   - Each worker creates its own Redis connection
   - Job data serialized as JSON (no compression)
   - Job payloads are small (mostly IDs and metadata)

3. **Redis Connection Management:**
   - Multiple connection managers exist
   - No connection pooling
   - Each queue/worker creates separate connections

---

## Optimization Tasks

### 1. Add Rate Limiters for High-Volume Queues ✅

**Objective:** Prevent overwhelming downstream services and Redis

**Implementation:**
- Add BullMQ RateLimiter for `sync-inbound-webhook` queue
- Add RateLimiter for `embedding-jobs` queue
- Configure limits based on external API rate limits

**Target Queues:**
- `sync-inbound-webhook`: 50 jobs/second
- `embedding-jobs`: 20 jobs/second (to respect OpenAI rate limits)

### 2. Optimize Redis Connection Pooling ✅

**Objective:** Reduce Redis connection overhead and improve resource utilization

**Implementation:**
- Create shared Redis connection pool
- Reuse connections across workers/queues
- Configure connection pool size based on worker count

**Configuration:**
- Pool size: Max 20 connections
- Connection reuse across queues

### 3. Optimize Job Data Serialization

**Objective:** Reduce Redis memory usage and network overhead

**Implementation:**
- Use compression for large job payloads (>1KB)
- Optimize job data structures (remove unnecessary fields)
- Consider MessagePack for binary serialization (if payloads grow)

**Note:** Current payloads are small, so this is lower priority

### 4. Tune Worker Concurrency Settings

**Objective:** Optimize throughput based on queue characteristics

**Implementation:**
- Increase concurrency for I/O-bound queues (sync workers)
- Decrease concurrency for CPU-bound queues (embedding workers)
- Make concurrency configurable per queue

**Target Settings:**
- `sync-inbound-webhook`: 10 (current, keep)
- `sync-inbound-scheduled`: 5 (current, keep)
- `embedding-jobs`: 3 (reduce from 5 to respect API limits)
- `enrichment-jobs`: 5 (current, keep)

---

## Implementation Steps

1. ✅ Add rate limiters to high-volume queues
2. ✅ Implement Redis connection pooling
3. ⏸️ Optimize job data serialization (deferred - current payloads are small, <1KB)
4. ✅ Tune worker concurrency settings (configured via environment variables, defaults match targets)
5. ✅ Add monitoring for rate limiter metrics

---

## Performance Targets

- **Rate Limiter Effectiveness:** <1% of jobs rate-limited
- **Redis Connection Count:** <20 total connections
- **Job Processing Latency:** <5% increase from rate limiting
- **Memory Usage:** <10% increase from connection pooling

---

## Monitoring

- ✅ Track rate limiter delayed jobs (jobs delayed due to rate limiting)
- ✅ Monitor rate limiter effectiveness (percentage of jobs rate-limited)
- ✅ Monitor Redis connection pool usage
- ✅ Track job processing times
- ✅ Monitor queue depth and throughput

### Rate Limiter Metrics

The following metrics are now tracked:
- `worker.rate_limiter_delayed` - Count of jobs delayed due to rate limiting
- `worker.rate_limiter_effectiveness` - Percentage of jobs rate-limited
- `worker.rate_limiter_delayed_total` - Total count of delayed jobs

These metrics are automatically tracked when a rate limiter is configured on a worker.
