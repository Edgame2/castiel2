'use client';

/**
 * CommentThread Component
 * Displays and manages comments on shared insights with threading support
 */

import { useState } from 'react';
import { MessageSquare, Edit2, Trash2, Reply, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import {
  useInsight,
  useAddComment,
  useEditComment,
  useDeleteComment,
} from '@/hooks/use-collaborative-insights';
import { useAuth } from '@/contexts/auth-context';
import type { InsightComment } from '@/lib/api/collaborative-insights';

interface CommentThreadProps {
  insightId: string;
  className?: string;
}

export function CommentThread({ insightId, className }: CommentThreadProps) {
  const { user } = useAuth();
  const { data: insight, isLoading } = useInsight(insightId);
  const [showAddComment, setShowAddComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [replyContent, setReplyContent] = useState('');

  const addComment = useAddComment();
  const editComment = useEditComment();
  const deleteComment = useDeleteComment();

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-4', className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const comments = insight?.comments || [];
  const topLevelComments = comments.filter((c) => !c.parentId);
  const repliesByParent = comments.reduce((acc, comment) => {
    if (comment.parentId) {
      if (!acc[comment.parentId]) {
        acc[comment.parentId] = [];
      }
      acc[comment.parentId].push(comment);
    }
    return acc;
  }, {} as Record<string, InsightComment[]>);

  const handleAddComment = async () => {
    if (!commentContent.trim()) return;

    await addComment.mutateAsync({
      insightId,
      data: { content: commentContent },
    });
    setCommentContent('');
    setShowAddComment(false);
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim()) return;

    await addComment.mutateAsync({
      insightId,
      data: { content: replyContent, parentId },
    });
    setReplyContent('');
    setReplyingToCommentId(null);
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!commentContent.trim()) return;

    await editComment.mutateAsync({
      insightId,
      commentId,
      data: { content: commentContent },
    });
    setCommentContent('');
    setEditingCommentId(null);
  };

  const handleDeleteComment = async () => {
    if (!deleteCommentId) return;

    await deleteComment.mutateAsync({
      insightId,
      commentId: deleteCommentId,
    });
    setDeleteCommentId(null);
  };

  const startEdit = (comment: InsightComment) => {
    setEditingCommentId(comment.id);
    setCommentContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setCommentContent('');
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Comments List */}
      {topLevelComments.length === 0 && !showAddComment && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No comments yet. Be the first to comment!
        </div>
      )}

      {topLevelComments.map((comment) => (
        <div key={comment.id} className="space-y-2">
          <CommentItem
            comment={comment}
            currentUserId={user?.id}
            onEdit={() => startEdit(comment)}
            onDelete={() => setDeleteCommentId(comment.id)}
            onReply={() => setReplyingToCommentId(comment.id)}
            isEditing={editingCommentId === comment.id}
            editContent={commentContent}
            onEditContentChange={setCommentContent}
            onSaveEdit={() => handleUpdateComment(comment.id)}
            onCancelEdit={cancelEdit}
            insightId={insightId}
          />

          {/* Replies */}
          {repliesByParent[comment.id] && repliesByParent[comment.id].length > 0 && (
            <div className="ml-8 space-y-2 border-l-2 pl-4">
              {repliesByParent[comment.id].map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={user?.id}
                  onEdit={() => startEdit(reply)}
                  onDelete={() => setDeleteCommentId(reply.id)}
                  isEditing={editingCommentId === reply.id}
                  editContent={commentContent}
                  onEditContentChange={setCommentContent}
                  onSaveEdit={() => handleUpdateComment(reply.id)}
                  onCancelEdit={cancelEdit}
                  insightId={insightId}
                />
              ))}
            </div>
          )}

          {/* Reply Input */}
          {replyingToCommentId === comment.id && (
            <div className="ml-8 space-y-2">
              <Textarea
                placeholder="Write a reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleReply(comment.id)}
                  disabled={!replyContent.trim() || addComment.isPending}
                >
                  {addComment.isPending ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3 mr-1" />
                  )}
                  Reply
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setReplyingToCommentId(null);
                    setReplyContent('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add Comment */}
      {showAddComment ? (
        <div className="space-y-2">
          <Textarea
            placeholder="Write a comment..."
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            rows={3}
            className="text-sm"
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleAddComment}
              disabled={!commentContent.trim() || addComment.isPending}
            >
              {addComment.isPending ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Send className="h-3 w-3 mr-1" />
              )}
              Post Comment
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowAddComment(false);
                setCommentContent('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddComment(true)}
          className="w-full"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Add Comment
        </Button>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCommentId} onOpenChange={() => setDeleteCommentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the comment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteComment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface CommentItemProps {
  comment: InsightComment;
  currentUserId?: string;
  onEdit: () => void;
  onDelete: () => void;
  onReply?: () => void;
  isEditing?: boolean;
  editContent?: string;
  onEditContentChange?: (content: string) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  insightId: string;
}

function CommentItem({
  comment,
  currentUserId,
  onEdit,
  onDelete,
  onReply,
  isEditing = false,
  editContent = '',
  onEditContentChange,
  onSaveEdit,
  onCancelEdit,
  insightId,
}: CommentItemProps) {
  const editComment = useEditComment();

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Textarea
          value={editContent}
          onChange={(e) => onEditContentChange?.(e.target.value)}
          rows={3}
          className="text-sm"
        />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onSaveEdit}
            disabled={!editContent.trim() || editComment.isPending}
          >
            {editComment.isPending ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              'Save'
            )}
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancelEdit}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = comment.userId === currentUserId;
  const userInitials = comment.userName
    .split(' ' as any)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || comment.userId.substring(0, 2).toUpperCase();

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <Avatar className="h-8 w-8">
        <AvatarFallback>{userInitials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{comment.userName}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
          {comment.isEdited && (
            <Badge variant="outline" className="text-xs">
              edited
            </Badge>
          )}
        </div>
        <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
        <div className="flex items-center gap-2 mt-2">
          {onReply && (
            <Button variant="ghost" size="sm" onClick={onReply} className="h-7 text-xs">
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
          )}
          {isOwner && (
            <>
              <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 text-xs">
                <Edit2 className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-7 text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}










