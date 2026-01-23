/**
 * Playbooks Page
 * Playbook execution management and monitoring
 */

'use client';

import { PlaybookExecution } from '@/components/cais/playbook-execution';

export default function PlaybooksPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Playbook Execution</h1>
        <p className="text-muted-foreground">
          Execute and monitor sales playbooks
        </p>
      </div>
      <PlaybookExecution />
    </div>
  );
}
