/**
 * Federated Learning Page
 * Start federated learning rounds for collaborative model training
 */

'use client';

import { FederatedLearning } from '@/components/cais/federated-learning';

export default function FederatedLearningPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Federated Learning</h1>
        <p className="text-muted-foreground">
          Start federated learning rounds for collaborative model training
        </p>
      </div>
      <FederatedLearning />
    </div>
  );
}
