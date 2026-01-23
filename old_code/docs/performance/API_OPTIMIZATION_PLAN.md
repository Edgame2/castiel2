# API Performance Optimization Plan

**Date:** 2025-01-XX  
**Status:** Implementation In Progress

---

## Executive Summary

This document outlines the optimization plan for the API to improve response times, reduce bandwidth usage, and optimize GraphQL query performance.

---

## Current State Analysis

### 1. Compression
- **Status:** ❌ Not enabled
- **Impact:** High - Reduces bandwidth usage by 60-80% for JSON responses
- **Action:** Add `@fastify/compress` middleware

### 2. GraphQL DataLoaders
- **Status:** ⚠️ Placeholders exist but are null
- **Impact:** High - Prevents N+1 queries in GraphQL resolvers
- **Action:** Implement DataLoaders for shards, shardTypes, revisions, ACL

### 3. HTTP Response Caching
- **Status:** ⚠️ Service-level caching exists, but no HTTP response caching
- **Impact:** Medium - Can cache entire HTTP responses for GET requests
- **Action:** Add response caching middleware with ETag support

### 4. Middleware Chain
- **Status:** ✅ Functional but could be optimized
- **Impact:** Low - Minor performance improvement
- **Action:** Ensure optimal middleware order

---

## Optimization Tasks

### 1. Add Compression ✅

**Objective:** Reduce bandwidth usage and improve response times

**Implementation:**
- Install `@fastify/compress`
- Register compression middleware early in the chain
- Configure compression for JSON, text, and HTML responses
- Use gzip/deflate compression

**Configuration:**
- Enable for responses > 1KB
- Use gzip as primary, deflate as fallback
- Exclude already-compressed content (images, videos)

### 2. Implement GraphQL DataLoaders ✅

**Objective:** Eliminate N+1 queries in GraphQL resolvers

**Implementation:**
- Create DataLoader instances for:
  - ShardLoader (by ID)
  - ShardTypeLoader (by ID)
  - RevisionLoader (by ID)
  - ACLLoader (by userId + shardId)
  - ShardsByTypeLoader (by shardTypeId)
- Initialize loaders in GraphQL context
- Use batch loading functions from repositories

**Target Loaders:**
- `shardLoader`: Batch load shards by ID
- `shardTypeLoader`: Batch load shard types by ID
- `revisionLoader`: Batch load revisions by ID
- `aclLoader`: Batch load ACL permissions
- `shardsByTypeLoader`: Batch load shards by type

### 3. Add HTTP Response Caching ✅

**Objective:** Cache entire HTTP responses for GET requests

**Implementation:**
- Create response caching middleware
- Support ETag headers for conditional requests
- Cache-Control headers for client-side caching
- Server-side caching with Redis
- Invalidate cache on mutations

**Configuration:**
- Cache GET requests only
- Default TTL: 5 minutes
- Use ETag for conditional requests (304 Not Modified)
- Cache-Control: public, max-age=300

### 4. Optimize Middleware Chain

**Objective:** Ensure optimal middleware execution order

**Implementation:**
- Order: Compression → CORS → Helmet → Auth → Response Cache → Routes
- Ensure compression is early
- Ensure caching is after authentication

---

## Implementation Steps

1. ✅ Add compression middleware
2. ✅ Implement GraphQL DataLoaders
3. ✅ Add HTTP response caching middleware
4. ⏳ Optimize middleware chain order

---

## Performance Targets

- **Compression Ratio:** 60-80% reduction in response size
- **GraphQL Query Performance:** <50ms for simple queries, <200ms for complex queries
- **Cache Hit Rate:** >70% for frequently accessed endpoints
- **Response Time Improvement:** 20-30% reduction for cached responses

---

## Monitoring

- Track compression ratios
- Monitor DataLoader batch sizes and cache hit rates
- Track HTTP response cache hit/miss rates
- Monitor ETag usage (304 responses)
