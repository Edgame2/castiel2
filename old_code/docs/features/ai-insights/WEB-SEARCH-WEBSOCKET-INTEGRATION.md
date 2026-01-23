# Web Search WebSocket Integration Guide

## Overview

This document describes the WebSocket integration for real-time deep search progress updates in the Web Search & Deep Search feature. WebSocket connections enable streaming of scraping progress events from the backend to the frontend UI in real-time.

## Architecture

### Component Stack

```
Web Search Page (/web-search)
├── useWebSearchWithContext hook
│   ├── useWebSearch (HTTP)
│   ├── useSearchHistory
│   ├── useSearchStatistics
│   ├── useCleanupSearchResults
│   ├── useRecurringSearch
│   └── useDeepSearchWithSocket (WebSocket) ← NEW
│
├── ScrapingProgress component
│   └── Displays real-time progress events from WebSocket
│
└── SearchResults, RecurringSearchForm, SearchStatistics...
    └── Standard HTTP-based components
```

### Data Flow

**Standard Web Search (HTTP)**
```
User Input
  ↓
SearchInput Component
  ↓
handleSearch() → useWebSearch.mutateAsync()
  ↓
API: POST /api/v1/search
  ↓
WebSearchService
  ↓
Response: { search: { results: [...] } }
  ↓
setSearchResults()
  ↓
SearchResults Component
```

**Deep Search with WebSocket**
```
User Input (with deepSearch enabled)
  ↓
SearchInput Component
  ↓
handleSearch() → search.mutateAsync() (HTTP)
  ↓
API: POST /api/v1/search (initial results)
  ↓
executeDeepSearch() → openDeepSearchSocket() (WebSocket)
  ↓
WebSocket: /api/v1/search/deep/ws?q=...&maxPages=...
  ↓
Backend:
  ├── Returns initial search results immediately
  └── Starts async scraping with WebSocket progress streaming
  
Progress Events (WebSocket stream):
  ├── { type: 'progress', data: ScrapingProgressEvent }
  ├── { type: 'progress', data: ScrapingProgressEvent }
  ├── { type: 'progress', data: ScrapingProgressEvent }
  ...
  └── { type: 'complete', data: { deepSearch: { pages: [...] } } }
      
Frontend:
  ├── setProgressEvents([...])
  ├── ScrapingProgress displays events
  └── Final completion callback: setDeepSearchPages()
```

## Key Components

### 1. useDeepSearchWithSocket Hook

**Location:** `apps/web/src/hooks/use-web-search.ts`

**Purpose:** Manages WebSocket lifecycle and streams scraping progress events

**Key Features:**
- Opens WebSocket connection to `/api/v1/search/deep/ws`
- Collects progress events in array (oldest to latest)
- Handles connection errors with automatic reconnection (up to 3 attempts)
- Cleans up connection on unmount or cancellation
- Invalidates related queries on completion

**API:**
```typescript
const {
  executeDeepSearch,      // Function to start deep search
  cancelSearch,           // Function to stop search and close socket
  progressEvents,         // Array of ScrapingProgressEvent
  isConnected,           // Boolean: connection state
  error,                 // Error message if connection failed
  latestProgress,        // Convenience: progressEvents[last]
} = useDeepSearchWithSocket()

// Start deep search
executeDeepSearch(
  query: string,
  options?: { maxPages?: number },
  onComplete?: (results: SearchResponsePayload) => void
): WebSocket

// Cancel ongoing search
cancelSearch(): void
```

**Error Handling:**
- WebSocket connection fails → automatic reconnection with exponential backoff
- Max 3 reconnection attempts
- Backoff delays: 1s, 2s, 3s
- Toast notifications for user feedback

### 2. ScrapingProgress Component

**Location:** `apps/web/src/components/ai-insights/web-search/scraping-progress.tsx`

**Purpose:** Displays real-time scraping progress with status badges and progress bars

**Props:**
```typescript
interface ScrapingProgressProps {
  events: ScrapingProgressEvent[]  // Array of progress events
  isWidget?: boolean               // Widget mode (optional)
  widgetSize?: 'small' | 'medium' | 'large' | 'full'
  widgetConfig?: {
    title?: string
    showHeader?: boolean
  }
}

interface ScrapingProgressEvent {
  currentPage: number           // Current page index (1-based)
  totalPages: number           // Total pages to scrape
  currentUrl: string           // URL being processed
  status: 'fetching' | 'parsing' | 'chunking' | 'embedding' | 'complete' | 'error'
  progress: number            // Overall progress percentage (0-100)
  message?: string            // Optional status message
}
```

**Display:**
- Latest progress at the top (with progress bar and status badge)
- Scrollable list of all progress events below
- Status color coding:
  - `fetching`: Sky blue
  - `parsing`: Amber
  - `chunking`: Indigo
  - `embedding`: Emerald
  - `complete`: Emerald
  - `error`: Rose

### 3. Web Search Page Integration

**Location:** `apps/web/src/app/(protected)/web-search/page.tsx`

**Deep Search Flow:**

```typescript
const { executeDeepSearch, progressEvents, isConnected, latestProgress } = useDeepSearchWithSocket()

const handleSearch = async (params) => {
  // 1. First perform regular web search
  const response = await search.mutateAsync({
    query: params.query,
    maxResults: params.maxResults || 10,
  })
  setSearchResults(response.search.results)
  
  // 2. If deep search enabled, initiate WebSocket
  if (params.deepSearch) {
    toast.info('Starting deep search via WebSocket...')
    executeDeepSearch(
      params.query,
      { maxPages: params.maxPages || 3 },
      (result) => {
        setDeepSearchPages(result.deepSearch?.pages || [])
        setIsSearching(false)
      }
    )
  }
}

// In render:
{enableDeepSearch && progressEvents.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle>Deep Search Progress</CardTitle>
      <CardDescription>
        {latestProgress?.currentPage}/{latestProgress?.totalPages} ({latestProgress?.progress || 0}%)
      </CardDescription>
    </CardHeader>
    <CardContent>
      <ScrapingProgress events={progressEvents} />
    </CardContent>
  </Card>
)}
```

## API Contract

### WebSocket Endpoint

**URL:** `wss://api.example.com/api/v1/search/deep/ws`

**Query Parameters:**
```
GET /search/deep/ws?q=<query>&maxPages=<number>

q: string (required)       - Search query
maxPages: number (optional) - Max pages to scrape (default: 3, max: 5)
```

**Authentication:** 
- Bearer token passed via authorization header
- Connection verified on WebSocket upgrade

**Message Format:**

Progress Event:
```json
{
  "type": "progress",
  "data": {
    "currentPage": 1,
    "totalPages": 3,
    "currentUrl": "https://example.com/article",
    "status": "fetching",
    "progress": 33,
    "message": "Fetching page content..."
  }
}
```

Completion Event:
```json
{
  "type": "complete",
  "data": {
    "search": { /* search results */ },
    "deepSearch": {
      "pages": [
        {
          "url": "https://example.com/article",
          "title": "Article Title",
          "content": "...",
          "chunks": [ /* semantic chunks */ ]
        }
      ],
      "totalCost": 0.15,
      "duration": 8500
    },
    "costBreakdown": { /* cost details */ }
  }
}
```

Error Event:
```json
{
  "type": "error",
  "error": "Failed to scrape page: [error message]"
}
```

## Implementation Details

### Reconnection Strategy

When WebSocket connection fails during deep search:

1. **Attempt 1:** Reconnect after 1 second
2. **Attempt 2:** Reconnect after 2 seconds
3. **Attempt 3:** Reconnect after 3 seconds
4. **Max Attempts:** 3 (then fail with error message)

Each reconnection retries the entire deep search operation from the beginning, losing previously collected progress events.

### Cleanup on Unmount

The `useDeepSearchWithSocket` hook automatically:
- Closes WebSocket connection on component unmount
- Clears progress events
- Resets connection state

```typescript
useEffect(() => {
  return () => {
    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }
  }
}, [])
```

### Query Client Integration

On successful completion, the hook invalidates related queries:

```typescript
queryClient.invalidateQueries({
  queryKey: webSearchKeys.history(),
})
queryClient.invalidateQueries({
  queryKey: webSearchKeys.statistics(),
})
```

This ensures search history and statistics are refreshed after deep search completes.

## Usage Examples

### Basic Deep Search

```typescript
import { useDeepSearchWithSocket } from '@/hooks/use-web-search'

export function MyComponent() {
  const { executeDeepSearch, progressEvents, isConnected, cancelSearch } = useDeepSearchWithSocket()

  const handleStartSearch = () => {
    executeDeepSearch(
      'react hooks tutorial',
      { maxPages: 5 },
      (result) => {
        console.log('Deep search completed:', result)
      }
    )
  }

  return (
    <div>
      <button onClick={handleStartSearch}>Start Deep Search</button>
      <button onClick={cancelSearch} disabled={!isConnected}>
        Cancel
      </button>
      
      {progressEvents.length > 0 && (
        <ScrapingProgress events={progressEvents} />
      )}
    </div>
  )
}
```

### Widget Embedding

```typescript
import { ScrapingProgress } from '@/components/ai-insights/web-search/scraping-progress'

export function DashboardWidget() {
  const { progressEvents } = useDeepSearchWithSocket()
  
  return (
    <ScrapingProgress
      events={progressEvents}
      isWidget
      widgetSize="medium"
      widgetConfig={{ title: 'Deep Search Progress' }}
    />
  )
}
```

### With Custom Callbacks

```typescript
const { executeDeepSearch, progressEvents } = useDeepSearchWithSocket()

const handleSearch = async () => {
  executeDeepSearch(
    query,
    { maxPages: 3 },
    (result) => {
      // Custom completion handler
      analytics.track('deep_search_completed', {
        query,
        pageCount: result.deepSearch?.pages.length,
        cost: result.costBreakdown.totalCost,
      })
    }
  )
}
```

## Debugging

### Enable Logging

Add debug logging in the hook:

```typescript
// In useDeepSearchWithSocket hook
onProgress: (progress) => {
  console.log('[WebSocket] Progress:', progress)
  setProgressEvents((prev) => [...prev, progress])
}
```

### Monitor WebSocket Connection

In browser DevTools:
1. Open Network tab
2. Filter by "WS" to show WebSocket connections
3. Click on the connection to see message frames
4. Monitor for errors (red X) or connection closures

### Test Scenarios

1. **Normal Completion:** Search completes with all progress events
2. **Network Disconnect:** WebSocket closes mid-search, automatic reconnection occurs
3. **User Cancellation:** Click "Cancel Deep Search" button, socket closes cleanly
4. **Error Handling:** Backend returns error event, displayed to user
5. **Page Reload:** User navigates away during search, cleanup occurs

## Performance Considerations

### Progress Event Accumulation

Progress events are stored in component state as array:
```typescript
const [progressEvents, setProgressEvents] = useState<ScrapingProgressEvent[]>([])
```

- For 3-10 page scrapes: ~50-100 events (minimal memory impact)
- Each event: ~500 bytes JSON
- Total memory: ~50KB (negligible)

### WebSocket Connection Limits

- **Max concurrent connections per browser:** 6-10 (browser-dependent)
- **Max message size:** 64MB (plenty for progress events)
- **Message latency:** <100ms typical (depending on network)

### Optimization Tips

1. **Debounce Updates:** If too many progress events, debounce UI updates:
   ```typescript
   const debouncedProgress = useCallback(
     debounce((progress) => setProgressEvents(p => [...p, progress]), 100),
     []
   )
   ```

2. **Pagination:** For very long searches, paginate progress display:
   ```typescript
   const pageSize = 20
   const visibleEvents = progressEvents.slice(-pageSize)
   ```

3. **Event Filtering:** Only show specific status changes:
   ```typescript
   const importantEvents = progressEvents.filter(
     e => e.status === 'complete' || e.status === 'error'
   )
   ```

## Troubleshooting

### "WebSocket connection error"
- **Cause:** Network connectivity issue or backend unavailable
- **Solution:** Check network tab, verify API server is running
- **Recovery:** Automatic reconnection with backoff

### "Failed to parse progress message"
- **Cause:** Malformed JSON from server
- **Solution:** Check backend WebSocket handler, verify message format
- **Debug:** Log raw message data

### Progress updates stop appearing
- **Cause:** WebSocket connection closed or backend crash
- **Solution:** Check browser console for errors, verify backend logs
- **Recovery:** Cancel search and retry

### High memory usage
- **Cause:** Too many progress events accumulating
- **Solution:** Clear history more frequently or implement event pruning
- **Alternative:** Use event pagination as shown above

## Testing

### Unit Tests

Test the hook in isolation:

```typescript
import { renderHook, act } from '@testing-library/react'
import { useDeepSearchWithSocket } from '@/hooks/use-web-search'

describe('useDeepSearchWithSocket', () => {
  it('should collect progress events', async () => {
    const { result } = renderHook(() => useDeepSearchWithSocket())
    
    act(() => {
      result.current.executeDeepSearch('test query')
    })
    
    // Simulate WebSocket message
    await act(async () => {
      // Mock WebSocket message
    })
    
    expect(result.current.progressEvents).toHaveLength(1)
  })
})
```

### Integration Tests

Test full deep search flow:

```typescript
describe('Deep Search Integration', () => {
  it('should perform deep search with WebSocket progress', async () => {
    const { getByText, getByRole } = render(<WebSearchPage />)
    
    // Enter search query
    const input = getByRole('textbox')
    fireEvent.change(input, { target: { value: 'react' } })
    
    // Enable deep search
    const toggleButton = getByRole('button', { name: /deep search/i })
    fireEvent.click(toggleButton)
    
    // Start search
    const searchButton = getByRole('button', { name: /search/i })
    fireEvent.click(searchButton)
    
    // Wait for progress display
    await waitFor(() => {
      expect(getByText(/deep search progress/i)).toBeInTheDocument()
    })
    
    // Verify progress updates
    await waitFor(() => {
      expect(getByText(/100%/)).toBeInTheDocument()
    })
  })
})
```

### E2E Tests

Test with real backend:

```typescript
import { test, expect } from '@playwright/test'

test('deep search with websocket progress', async ({ page }) => {
  await page.goto('/web-search')
  
  // Enter search
  await page.fill('input[placeholder="Search query"]', 'typescript')
  
  // Enable deep search
  await page.click('input[type="checkbox"][aria-label="Enable deep search"]')
  
  // Start search
  await page.click('button:has-text("Search")')
  
  // Monitor WebSocket messages
  const wsMessages = []
  page.on('websocket', ws => {
    ws.on('framereceived', event => {
      if (event.payload.type === 'progress') {
        wsMessages.push(event.payload)
      }
    })
  })
  
  // Wait for completion
  await page.waitForSelector('text=100%', { timeout: 30000 })
  
  // Verify progress events
  expect(wsMessages.length).toBeGreaterThan(0)
  expect(wsMessages[wsMessages.length - 1].data.status).toBe('complete')
})
```

## Migration Guide

### From HTTP Deep Search to WebSocket

If you previously used HTTP-only deep search:

**Before:**
```typescript
const result = await deepSearchWeb(query, { maxPages: 3 })
setDeepSearchPages(result.deepSearch?.pages || [])
```

**After:**
```typescript
const { executeDeepSearch } = useDeepSearchWithSocket()

executeDeepSearch(
  query,
  { maxPages: 3 },
  (result) => {
    setDeepSearchPages(result.deepSearch?.pages || [])
  }
)
```

## Future Enhancements

1. **Progress Persistence:** Store progress events in IndexedDB for offline viewing
2. **Event Filtering:** Allow users to filter by status (show only errors, for example)
3. **Real-time Analytics:** Track scraping performance metrics
4. **Rate Limiting UI:** Show remaining API calls and costs in real-time
5. **Multi-Query Support:** Queue multiple searches with progress tracking per search
6. **Push Notifications:** Notify when deep search completes (especially for long-running searches)

## References

- [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Fastify WebSocket](https://github.com/fastify/fastify-websocket)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Sonner Toast Library](https://sonner.emilkowal.ski/)
