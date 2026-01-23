'use client';

/**
 * ReactionPicker Component
 * Allows users to add/remove reactions to shared insights
 */

import { useState } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAddReaction, useRemoveReaction } from '@/hooks/use-collaborative-insights';
import type { ReactionType, InsightReaction } from '@/lib/api/collaborative-insights';
import { useAuth } from '@/contexts/auth-context';

const REACTION_TYPES: ReactionType[] = ['👍', '❤️', '💡', '🎯', '⭐', '🔥'];

interface ReactionPickerProps {
  insightId: string;
  reactions: InsightReaction[];
  className?: string;
}

export function ReactionPicker({ insightId, reactions, className }: ReactionPickerProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();

  // Get current user's reactions
  const userReactions = reactions.filter((r) => r.userId === user?.id);
  const userReactionTypes = new Set(userReactions.map((r) => r.type));

  // Group reactions by type
  const reactionsByType = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.type]) {
      acc[reaction.type] = [];
    }
    acc[reaction.type].push(reaction);
    return acc;
  }, {} as Record<ReactionType, InsightReaction[]>);

  const handleReactionClick = async (reactionType: ReactionType) => {
    const hasReaction = userReactionTypes.has(reactionType);

    if (hasReaction) {
      // Remove reaction
      await removeReaction.mutateAsync(insightId);
    } else {
      // Add reaction
      await addReaction.mutateAsync({ insightId, reactionType });
    }
    setOpen(false);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Existing reactions */}
      <div className="flex items-center gap-1">
        {REACTION_TYPES.map((type) => {
          const typeReactions = reactionsByType[type] || [];
          if (typeReactions.length === 0) return null;

          const isUserReaction = userReactionTypes.has(type);
          const count = typeReactions.length;

          return (
            <Button
              key={type}
              variant={isUserReaction ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'h-7 px-2 text-xs',
                isUserReaction && 'bg-primary text-primary-foreground'
              )}
              onClick={() => handleReactionClick(type)}
            >
              <span className="text-base">{type}</span>
              {count > 1 && <span className="ml-1">{count}</span>}
            </Button>
          );
        })}
      </div>

      {/* Add reaction button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2">
            <Smile className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex items-center gap-1">
            {REACTION_TYPES.map((type) => {
              const isUserReaction = userReactionTypes.has(type);
              return (
                <Button
                  key={type}
                  variant={isUserReaction ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-9 w-9 p-0 text-lg',
                    isUserReaction && 'bg-primary text-primary-foreground'
                  )}
                  onClick={() => handleReactionClick(type)}
                  title={isUserReaction ? `Remove ${type}` : `Add ${type}`}
                >
                  {type}
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}










