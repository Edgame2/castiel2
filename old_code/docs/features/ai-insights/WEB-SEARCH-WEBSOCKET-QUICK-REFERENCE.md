# WebSocket Deep Search - Quick Reference Guide

## 🚀 Quick Start

### Basic Usage in a Component

```typescript
import { useDeepSearchWithSocket } from '@/hooks/use-web-search'

export function MySearchComponent() {
  const { executeDeepSearch, progressEvents, isConnected, cancelSearch } = useDeepSearchWithSocket()

  const handleSearch = async () => {
    executeDeepSearch(
      'search query',
      { maxPages: 3 },
      (result) => console.log('Done:', result)
    )
  }

  return (
    <div>
      <button onClick={handleSearch}>Start Deep Search</button>
      <button onClick={cancelSearch} disabled={!isConnected}>Cancel</button>
      
      {progressEvents.map((e) => (
        <div key={e.currentUrl}>
          {e.currentUrl} - {e.progress}% ({e.status})
        </div>
      ))}
    </div>
  )
}
```

### Using with ScrapingProgress Component

```typescript
import { ScrapingProgress } from '@/components/ai-insights/web-search/scraping-progress'

export function MySearchPage() {
  const { progressEvents } = useDeepSearchWithSocket()
  
  return (
    <ScrapingProgress events={progressEvents} />
  )
}
```

## 📚 API Reference

### useDeepSearchWithSocket Hook

```typescript
const {
  executeDeepSearch,
  cancelSearch,
  progressEvents,
  isConnected,
  error,
  latestProgress,
} = useDeepSearchWithSocket()
```

| Property | Type | Description |
|----------|------|-------------|
| `executeDeepSearch` | `(query, options?, onComplete?) => WebSocket` | Start deep search with optional callback |
| `cancelSearch` | `() => void` | Stop search and close WebSocket |
| `progressEvents` | `ScrapingProgressEvent[]` | Array of progress events (oldest first) |
| `isConnected` | `boolean` | WebSocket connection status |
| `error` | `string \| null` | Error message if connection failed |
| `latestProgress` | `ScrapingProgressEvent \| undefined` | Most recent progress event |

### ScrapingProgressEvent Structure

```typescript
{
  currentPage: number         // 1-based page index
  totalPages: number         // Total pages to scrape
  currentUrl: string         // URL being processed
  status: 'fetching' | 'parsing' | 'chunking' | 'embedding' | 'complete' | 'error'
  progress: number           // 0-100 percentage
  message?: string          // Optional status message
}
```

## 🎯 Common Patterns

### Pattern 1: Simple Deep Search

```typescript
const { executeDeepSearch } = useDeepSearchWithSocket()

const handleSearch = (query: string) => {
  executeDeepSearch(query, { maxPages: 5 })
}
```

### Pattern 2: Deep Search with Callback

```typescript
const handleSearch = (query: string) => {
  executeDeepSearch(
    query,
    { maxPages: 3 },
    (result) => {
      console.log('Results:', result)
      updateUI(result)
    }
  )
}
```

### Pattern 3: Progress Monitoring

```typescript
const { progressEvents, latestProgress } = useDeepSearchWithSocket()

useEffect(() => {
  if (latestProgress) {
    console.log(`Progress: ${latestProgress.progress}%`)
    console.log(`URL: ${latestProgress.currentUrl}`)
    console.log(`Status: ${latestProgress.status}`)
  }
}, [latestProgress])
```

### Pattern 4: Error Handling

```typescript
const { executeDeepSearch, error, isConnected } = useDeepSearchWithSocket()

const handleSearch = async (query: string) => {
  try {
    executeDeepSearch(query)
    
    if (error) {
      toast.error(`Search failed: ${error}`)
    }
  } catch (err) {
    toast.error('Unexpected error occurred')
  }
}
```

### Pattern 5: Cancellation

```typescript
const { executeDeepSearch, cancelSearch, isConnected } = useDeepSearchWithSocket()

const handleSearch = (query: string) => {
  executeDeepSearch(query)
}

const handleCancel = () => {
  cancelSearch()
  toast.info('Search cancelled')
}

return (
  <div>
    <button onClick={() => handleSearch('react')}>Search</button>
    <button onClick={handleCancel} disabled={!isConnected}>
      Cancel
    </button>
  </div>
)
```

## 🔧 Configuration

### Max Pages

```typescript
executeDeepSearch(query, { maxPages: 5 })  // Max 10, default 3
```

### Custom Callbacks

```typescript
const onComplete = (result: SearchResponsePayload) => {
  // Handle completion
  const pages = result.deepSearch?.pages || []
  const cost = result.costBreakdown.totalCost
}

executeDeepSearch(query, { maxPages: 3 }, onComplete)
```

## 📊 Status Values

| Status | Meaning | Color |
|--------|---------|-------|
| `fetching` | Fetching page content | Sky blue |
| `parsing` | Parsing HTML/content | Amber |
| `chunking` | Creating semantic chunks | Indigo |
| `embedding` | Generating embeddings | Emerald |
| `complete` | Page processing complete | Emerald |
| `error` | Processing error | Rose |

## ⚡ Performance Tips

### 1. Limit Max Pages
```typescript
// ✅ Good - limits to 5 pages max
executeDeepSearch(query, { maxPages: 5 })

// ❌ Avoid - unlimited scraping
executeDeepSearch(query, { maxPages: 100 })
```

### 2. Debounce Progress Updates
```typescript
const { progressEvents } = useDeepSearchWithSocket()
const debouncedProgress = useMemo(
  () => debounce((e) => updateUI(e), 200),
  []
)

useEffect(() => {
  debouncedProgress(latestProgress)
}, [latestProgress])
```

### 3. Clear Old Events
```typescript
const { progressEvents, cancelSearch } = useDeepSearchWithSocket()

useEffect(() => {
  // Cleanup on unmount
  return () => {
    cancelSearch()  // Also clears events
  }
}, [])
```

## 🐛 Debugging

### Log All Progress Events
```typescript
const { progressEvents } = useDeepSearchWithSocket()

useEffect(() => {
  console.log('[WebSocket] Events:', progressEvents)
}, [progressEvents])
```

### Monitor WebSocket Connection
```typescript
const { isConnected, error } = useDeepSearchWithSocket()

useEffect(() => {
  console.log('[WebSocket] Connected:', isConnected)
  console.log('[WebSocket] Error:', error)
}, [isConnected, error])
```

### Browser DevTools
1. Open Network tab
2. Filter by "WS" to show WebSocket connections
3. Click on `/search/deep/ws` connection
4. View message frames (progress events)
5. Monitor for errors or disconnections

## ❌ Common Mistakes

### ❌ Don't: Create hook in conditional
```typescript
// WRONG - hook called conditionally
if (enabled) {
  const { executeDeepSearch } = useDeepSearchWithSocket()
}
```

### ✅ Do: Always call hook at top level
```typescript
// CORRECT - hook called at top level
const { executeDeepSearch } = useDeepSearchWithSocket()

if (enabled) {
  executeDeepSearch(query)
}
```

### ❌ Don't: Forget to clean up
```typescript
// WRONG - no cleanup on unmount
const { executeDeepSearch } = useDeepSearchWithSocket()
```

### ✅ Do: Cleanup properly
```typescript
// CORRECT - cleanup on unmount
const { cancelSearch } = useDeepSearchWithSocket()

useEffect(() => {
  return () => {
    cancelSearch()  // Close socket on unmount
  }
}, [])
```

### ❌ Don't: Ignore reconnection limits
```typescript
// WRONG - tries infinitely
while (!connected) {
  executeDeepSearch(query)
  await delay(100)
}
```

### ✅ Do: Let hook handle reconnection
```typescript
// CORRECT - hook handles reconnection
executeDeepSearch(query)  // Max 3 reconnection attempts built-in
```

## 📱 Widget Mode

### Using as Widget
```typescript
<ScrapingProgress
  events={progressEvents}
  isWidget={true}
  widgetSize="medium"
  widgetConfig={{ title: 'Deep Search Progress' }}
/>
```

### Widget Sizes
- `small` - 384px height (h-96)
- `medium` - 600px height (h-[600px])
- `large` - 800px height (h-[800px])
- `full` - Full screen (min-h-screen)

## 🔗 Related Documentation

- **Full Guide:** `/docs/WEB-SEARCH-WEBSOCKET-INTEGRATION.md`
- **Implementation Status:** `/IMPLEMENTATION-STATUS-DECEMBER-2025.md`
- **Component Docs:** Component stories (TBD)
- **API Specs:** `/docs/API.md`

## 🆘 Support

### Getting Help
1. Check browser DevTools (Network → WS)
2. Check console logs for errors
3. Review full integration guide
4. Check test cases for examples

### Reporting Issues
Include:
- Browser version
- Network conditions
- Component code
- Console errors
- WebSocket frame data

## 📝 Examples Repository

See `/tests/websocket-integration.test.ts` for testing patterns and examples.

---

**Last Updated:** December 5, 2025  
**Version:** 1.0  
**Status:** ✅ Production Ready
