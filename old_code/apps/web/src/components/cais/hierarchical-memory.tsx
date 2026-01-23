/**
 * Hierarchical Memory Component
 * Displays memory records, memory tiers, and retrieval results
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Database,
  RefreshCw,
  Send,
  Search,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { useStoreMemory, useRetrieveMemory } from '@/hooks/use-cais-services';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { handleApiError } from '@/lib/api/client';
import type { MemoryRecord, MemoryRetrieveResult } from '@/lib/api/cais-services';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface HierarchicalMemoryProps {
  className?: string;
}

export function HierarchicalMemory({ className }: HierarchicalMemoryProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId || '';

  // Store Memory State
  const [storeTier, setStoreTier] = useState<'immediate' | 'session' | 'temporal' | 'relational' | 'global'>('immediate');
  const [storeContextKey, setStoreContextKey] = useState('');
  const [storeContent, setStoreContent] = useState('');
  const [storeTags, setStoreTags] = useState('');

  // Retrieve Memory State
  const [retrieveContextKey, setRetrieveContextKey] = useState('');
  const [retrieveTier, setRetrieveTier] = useState<string>('');
  const [retrieveLimit, setRetrieveLimit] = useState(10);
  const [retrievedData, setRetrievedData] = useState<MemoryRetrieveResult | null>(null);

  const {
    mutate: store,
    isPending: isStoring,
    error: storeError,
  } = useStoreMemory();

  const {
    data: retrieveResult,
    isLoading: isRetrieving,
    error: retrieveError,
    refetch: refetchRetrieve,
  } = useRetrieveMemory({
    tenantId,
    contextKey: retrieveContextKey || undefined,
    tier: retrieveTier || undefined,
    limit: retrieveLimit,
  });

  const handleStore = () => {
    if (!storeContextKey || !storeContent) return;

    let contentObj: any;
    try {
      contentObj = JSON.parse(storeContent);
    } catch (e) {
      contentObj = { text: storeContent };
    }

    const tagsArray = storeTags ? storeTags.split(',').map(t => t.trim()).filter(Boolean) : undefined;

    store(
      {
        tenantId,
        tier: storeTier,
        content: contentObj,
        contextKey: storeContextKey,
        tags: tagsArray,
      },
      {
        onSuccess: () => {
          setStoreContent('');
          setStoreTags('');
          if (retrieveContextKey === storeContextKey) {
            refetchRetrieve();
          }
        },
        onError: (err) => {
          const errorObj = err instanceof Error ? err : new Error(String(err))
          trackException(errorObj, 3)
          trackTrace('Failed to store memory', 3, {
            errorMessage: errorObj.message,
            tenantId,
          })
        },
      }
    );
  };

  const handleRetrieve = () => {
    refetchRetrieve();
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Store Memory */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Store Memory
          </CardTitle>
          <CardDescription>
            Store a memory record in the hierarchical memory system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="store-tier">Memory Tier</Label>
                <Select value={storeTier} onValueChange={(value: any) => setStoreTier(value)}>
                  <SelectTrigger id="store-tier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="session">Session</SelectItem>
                    <SelectItem value="temporal">Temporal</SelectItem>
                    <SelectItem value="relational">Relational</SelectItem>
                    <SelectItem value="global">Global</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-context-key">Context Key</Label>
                <Input
                  id="store-context-key"
                  value={storeContextKey}
                  onChange={(e) => setStoreContextKey(e.target.value)}
                  placeholder="e.g., opportunity:12345"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="store-content">Content (JSON or Text)</Label>
              <Textarea
                id="store-content"
                value={storeContent}
                onChange={(e) => setStoreContent(e.target.value)}
                placeholder='Enter memory content as JSON or plain text'
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="store-tags">Tags (comma-separated, optional)</Label>
              <Input
                id="store-tags"
                value={storeTags}
                onChange={(e) => setStoreTags(e.target.value)}
                placeholder="tag1, tag2, tag3"
              />
            </div>

            <Button
              onClick={handleStore}
              disabled={!storeContextKey || !storeContent || isStoring}
              className="w-full"
            >
              {isStoring ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Storing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Store Memory
                </>
              )}
            </Button>

            {storeError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Storage Failed</AlertTitle>
                <AlertDescription>
                  {typeof handleApiError(storeError) === 'string'
                    ? handleApiError(storeError)
                    : (handleApiError(storeError) as any).message || 'Failed to store memory'}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Retrieve Memory */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Retrieve Memory
          </CardTitle>
          <CardDescription>
            Retrieve memory records from the hierarchical memory system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="retrieve-context-key">Context Key (Optional)</Label>
                <Input
                  id="retrieve-context-key"
                  value={retrieveContextKey}
                  onChange={(e) => setRetrieveContextKey(e.target.value)}
                  placeholder="Filter by context key"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="retrieve-tier">Tier (Optional)</Label>
                <Select value={retrieveTier} onValueChange={setRetrieveTier}>
                  <SelectTrigger id="retrieve-tier">
                    <SelectValue placeholder="All tiers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Tiers</SelectItem>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="session">Session</SelectItem>
                    <SelectItem value="temporal">Temporal</SelectItem>
                    <SelectItem value="relational">Relational</SelectItem>
                    <SelectItem value="global">Global</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="retrieve-limit">Limit</Label>
                <Input
                  id="retrieve-limit"
                  type="number"
                  value={retrieveLimit}
                  onChange={(e) => setRetrieveLimit(parseInt(e.target.value) || 10)}
                  min={1}
                  max={100}
                />
              </div>
            </div>

            <Button
              onClick={handleRetrieve}
              disabled={isRetrieving}
              className="w-full"
            >
              {isRetrieving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Retrieving...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Retrieve Memories
                </>
              )}
            </Button>

            {retrieveError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Retrieval Failed</AlertTitle>
                <AlertDescription>
                  {typeof handleApiError(retrieveError) === 'string'
                    ? handleApiError(retrieveError)
                    : (handleApiError(retrieveError) as any).message || 'Failed to retrieve memories'}
                </AlertDescription>
              </Alert>
            )}

            {/* Results */}
            {retrieveResult && (
              <div className="space-y-4 mt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Found {retrieveResult.totalCount} memory record(s)
                  </p>
                </div>

                {retrieveResult.records.length > 0 ? (
                  <div className="space-y-3">
                    {retrieveResult.records.map((record) => (
                      <Card key={record.recordId} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="capitalize">{record.tier}</Badge>
                              <span className="text-xs font-mono text-muted-foreground">{record.recordId}</span>
                            </div>
                            <p className="text-sm font-medium">Context: {record.contextKey}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(record.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {record.tags && record.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {record.tags.map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        )}
                        <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-32">
                          {JSON.stringify(record.content, null, 2)}
                        </pre>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No memory records found
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
