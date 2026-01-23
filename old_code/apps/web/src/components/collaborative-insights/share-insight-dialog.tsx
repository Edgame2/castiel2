'use client';

/**
 * ShareInsightDialog Component
 * Dialog for sharing insights with team members with visibility and target selection
 */

import { useState } from 'react';
import { Share2, Loader2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPicker } from '@/components/ui/user-picker';
import { Badge } from '@/components/ui/badge';
import { useShareInsight } from '@/hooks/use-collaborative-insights';
import type { ShareInsightRequest, InsightVisibility, ShareTarget } from '@/lib/api/collaborative-insights';

interface ShareInsightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceType: 'conversation' | 'quick_insight' | 'scheduled' | 'proactive';
  sourceId: string;
  defaultTitle?: string;
  defaultContent?: string;
  defaultSummary?: string;
  relatedShardIds?: string[];
  onSuccess?: () => void;
}

export function ShareInsightDialog({
  open,
  onOpenChange,
  sourceType,
  sourceId,
  defaultTitle = '',
  defaultContent = '',
  defaultSummary = '',
  relatedShardIds = [],
  onSuccess,
}: ShareInsightDialogProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [content, setContent] = useState(defaultContent);
  const [summary, setSummary] = useState(defaultSummary);
  const [visibility, setVisibility] = useState<InsightVisibility>('team');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const shareInsight = useShareInsight();

  const handleShare = async () => {
    if (!title.trim() || !content.trim()) {
      return;
    }

    // Build sharedWith array if visibility is 'specific'
    let sharedWith: ShareTarget[] | undefined;
    if (visibility === 'specific') {
      if (selectedUserIds.length === 0) {
        return; // Need at least one target for specific visibility
      }
      sharedWith = selectedUserIds.map((userId) => ({
        type: 'user' as const,
        id: userId,
        name: userId, // Will be resolved on backend
        canComment: true,
        canReshare: true,
      }));
    }

    const request: ShareInsightRequest = {
      sourceType,
      sourceId,
      title: title.trim(),
      content: content.trim(),
      summary: summary.trim() || undefined,
      visibility,
      sharedWith,
      relatedShardIds: relatedShardIds.length > 0 ? relatedShardIds : undefined,
      tags: tags.length > 0 ? tags : undefined,
      expiresAt: expiresAt || undefined,
    };

    try {
      await shareInsight.mutateAsync(request);
      // Reset form
      setTitle(defaultTitle);
      setContent(defaultContent);
      setSummary(defaultSummary);
      setVisibility('team');
      setSelectedUserIds([]);
      setTags([]);
      setTagInput('');
      setExpiresAt('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag) && tags.length < 20) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Insight</DialogTitle>
          <DialogDescription>
            Share this insight with your team. Choose who can see it and how they can interact with it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter insight title..."
              maxLength={500}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter insight content..."
              rows={6}
              maxLength={100000}
            />
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">Summary (Optional)</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief summary of the insight..."
              rows={2}
              maxLength={1000}
            />
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility *</Label>
            <Select value={visibility} onValueChange={(value) => setVisibility(value as InsightVisibility)}>
              <SelectTrigger id="visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private - Only you</SelectItem>
                <SelectItem value="team">Team - Your team members</SelectItem>
                <SelectItem value="department">Department - Your department</SelectItem>
                <SelectItem value="tenant">Tenant - All organization members</SelectItem>
                <SelectItem value="specific">Specific - Selected users/teams/roles</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Specific targets */}
          {visibility === 'specific' && (
            <div className="space-y-2">
              <Label htmlFor="targets">Select Users/Teams/Roles *</Label>
              <UserPicker
                value={selectedUserIds}
                onChange={(value) => setSelectedUserIds(Array.isArray(value) ? value : value ? [value] : [])}
                multiple
                placeholder="Search and select users..."
                displayFormat="full"
                showAvatar
              />
              <p className="text-xs text-muted-foreground">
                Select at least one user, team, or role to share with
              </p>
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a tag and press Enter..."
                maxLength={50}
              />
              <Button type="button" variant="outline" onClick={handleAddTag} disabled={!tagInput.trim()}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Add up to 20 tags to help organize insights</p>
          </div>

          {/* Expiration */}
          <div className="space-y-2">
            <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
            <Input
              id="expiresAt"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Set when this insight should expire and be automatically archived
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={shareInsight.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={
              shareInsight.isPending ||
              !title.trim() ||
              !content.trim() ||
              (visibility === 'specific' && selectedUserIds.length === 0)
            }
          >
            {shareInsight.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Share2 className="mr-2 h-4 w-4" />
                Share Insight
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}










