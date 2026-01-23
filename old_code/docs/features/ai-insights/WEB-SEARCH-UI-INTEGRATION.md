# Web Search UI Integration Guide

## Overview

This guide covers the integration of Web Search UI components into the CASTIEL platform.

## Components Created

### 1. **UI Components** (`apps/web/src/components/ai-insights/web-search/`)

- **SearchInput.tsx** - Query builder with filters
- **SearchResults.tsx** - Display results with citations
- **DeepSearchToggle.tsx** - Enable/configure deep search
- **ScrapingProgress.tsx** - Real-time progress indicator
- **RecurringSearchForm.tsx** - Create recurring searches
- **SearchStatistics.tsx** - Display search metrics
- **WebPagePreview.tsx** - Show scraped page content
- **WebSearchWidget.tsx** - Embeddable widget container

### 2. **API Hook** (`apps/web/src/hooks/use-web-search.ts`)

Provides React Query hooks for:
- `useWebSearch()` - Perform web searches
- `useSearchHistory()` - Fetch search history
- `useSearchStatistics()` - Get search metrics
- `useCleanupSearchResults()` - Clean old results
- `useRecurringSearch()` - Create recurring searches
- `useDeepSearchProgress()` - Stream progress via WebSocket
- `useWebSearchWithContext()` - Combined hook with all features

### 3. **Pages**

- **Web Search Page** (`apps/web/src/app/(protected)/web-search/page.tsx`)
  - Full-featured standalone page
  - Multiple tabs: Search, History, Recurring, Statistics
  - Responsive design
  - Component showcase

## Integration Points

### Standalone Page

Access the web search page at:
```
/web-search
```

### Dashboard Widget

Embed in dashboard layouts:

```tsx
import { WebSearchWidget } from '@/components/ai-insights/web-search/web-search-widget'

export function MyDashboard() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <WebSearchWidget
        widgetSize="medium"
        widgetConfig={{
          title: "Quick Search",
          showStats: true,
          enableDeepSearch: true,
        }}
      />
    </div>
  )
}
```

### AI Chat Integration

In chat pages where you want to enable web search:

```tsx
import { SearchInput } from '@/components/ai-insights/web-search/search-input'
import { useWebSearch } from '@/hooks/use-web-search'

export function ChatWithSearch() {
  const search = useWebSearch()

  const handleSearch = (params) => {
    return search.mutateAsync(params)
  }

  return (
    <>
      <ChatInterface />
      <SearchInput onSearch={handleSearch} />
    </>
  )
}
```

### Projects/Shards Integration

Display web search results as part of shard context:

```tsx
import { SearchResults } from '@/components/ai-insights/web-search/search-results'

export function ProjectDetails({ projectId }) {
  const { data: results } = useWebSearch()

  return (
    <div>
      <ProjectInfo projectId={projectId} />
      <SearchResults results={results} />
    </div>
  )
}
```

## Widget Configuration

All components support widget mode with the following props:

```typescript
interface WidgetProps {
  isWidget?: boolean              // Enable widget mode
  widgetSize?: 'small' | 'medium' | 'large' | 'full'
  widgetConfig?: {
    title?: string               // Custom title
    showHeader?: boolean         // Show/hide header
    showFooter?: boolean         // Show/hide footer
    refreshInterval?: number     // Auto-refresh interval (ms)
    [key: string]: any          // Component-specific config
  }
}
```

## API Integration

All components use the following API client functions (from `@/lib/api/web-search.ts`):

### Search Operations
```typescript
searchWeb(request: SearchRequest): Promise<SearchResponsePayload>
deepSearch(request: DeepSearchRequest): Promise<DeepSearchResponse>
```

### History & Statistics
```typescript
getSearchHistory(options?: { limit?: number; offset?: number }): Promise<SearchHistoryItem[]>
getSearchStatistics(): Promise<SearchStatistics>
cleanupSearchResults(olderThanDays: number): Promise<{ deleted: number }>
```

### Recurring Searches
```typescript
createRecurringSearch(request: RecurringSearchRequest): Promise<RecurringSearchConfig>
```

### WebSocket Progress
```typescript
// Manual WebSocket connection for deep search progress
const ws = new WebSocket(`${wsUrl}/api/v1/insights/deep-search/${sessionId}/progress?token=${token}`)
```

## Data Flow

### Simple Search
```
User Input → SearchInput → useWebSearch() → API → SearchResults → Display
```

### Deep Search
```
User Input → SearchInput → useWebSearch() + DeepSearchToggle 
  → API (search + async deep-search) 
  → WebSocket (progress updates) 
  → ScrapingProgress (show progress) 
  → SearchResults + WebPagePreview (display)
```

### Recurring Searches
```
RecurringSearchForm → useRecurringSearch() → API 
  → Creates scheduled search jobs
  → Results stored in c_search container with TTL
```

## Environment Configuration

Required environment variables in `.env.local`:

```env
# API endpoint (used for WebSocket connections)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# Optional: WebSocket configuration
NEXT_PUBLIC_WS_RECONNECT_INTERVAL=3000
NEXT_PUBLIC_WS_MAX_RETRIES=5
```

## Testing

### Component Testing

Each component has a Storybook story:
```bash
npm run storybook
```

### Integration Testing

Test hooks with React Query:
```bash
npm run test use-web-search
```

### E2E Testing

Test full flows with Playwright:
```bash
npm run test:e2e web-search
```

## Performance Considerations

### Caching
- Search results cached for 5 minutes
- History and statistics cached for 5-10 minutes
- Automatic cache invalidation on mutations

### Pagination
- Results paginated by default (10 per page)
- Load more on scroll or pagination button
- Infinite scroll available in SearchResults

### Lazy Loading
- Components load data on demand
- WebSocket connections only when needed
- Statistics fetch on tab activation

## Security

### Authentication
- All API calls authenticated with JWT token
- Token automatically injected by API client
- WebSocket requires token parameter

### Authorization
- Search scoped to current tenant
- Deep search requires project permission
- Statistics read-only for users

### Data Sanitization
- Snippet text HTML-escaped
- URLs validated before display
- Content chunks sanitized

## Troubleshooting

### WebSocket Not Connecting
1. Verify `NEXT_PUBLIC_API_BASE_URL` is set
2. Check API server is running
3. Verify token is valid
4. Check browser console for network errors

### Search Results Empty
1. Check search query (try generic term like "help")
2. Verify API is running and accessible
3. Check browser network tab for API errors
4. Review search provider configuration (SerpAPI/Bing)

### Components Not Loading
1. Verify all imports are correct
2. Check that shadcn/ui components are installed
3. Verify TypeScript compilation
4. Check browser console for module errors

## Next Steps

1. **Integrate with Context Assembly** - Auto-trigger web search based on user intent
2. **Connect to Grounding Service** - Add citations and source attribution
3. **Add Vector Search** - Semantic search using embeddings
4. **Implement Caching** - Cache results with Redis
5. **Add Analytics** - Track search usage and costs
6. **Create Admin Dashboard** - Manage search providers and quotas

## Related Documentation

- **[WEB-SEARCH-DEEP-SEARCH.md](../docs/features/ai-insights/WEB-SEARCH-DEEP-SEARCH.md)** - Comprehensive specification
- **[API.md](../docs/features/ai-insights/API.md)** - API reference
- **[IMPLEMENTATION-GUIDE.md](../docs/features/ai-insights/IMPLEMENTATION-GUIDE.md)** - Full implementation guide
