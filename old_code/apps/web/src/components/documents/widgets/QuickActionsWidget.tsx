'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FolderPlus, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface QuickActionsWidgetProps {
  onUpload?: () => void;
  onCreateCollection?: () => void;
}

/**
 * Dashboard widget with quick action buttons
 */
export function QuickActionsWidget({
  onUpload,
  onCreateCollection,
}: QuickActionsWidgetProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common document tasks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={onUpload || (() => router.push('/documents/upload'))}
        >
          <Upload className="h-4 w-4" />
          Upload Documents
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => router.push('/documents')}
        >
          <FileText className="h-4 w-4" />
          Browse Documents
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={onCreateCollection || (() => router.push('/collections'))}
        >
          <FolderPlus className="h-4 w-4" />
          Create Collection
        </Button>
      </CardContent>
    </Card>
  );
}
