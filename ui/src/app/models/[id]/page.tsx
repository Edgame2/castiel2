/**
 * Model card page (Plan §11.9, §946).
 * GET /api/v1/ml/models/:id/card. Displays purpose, input, output, limitations.
 */

import Link from 'next/link';
import { ModelCard } from '@/components/ml/ModelCard';

type Props = { params: Promise<{ id: string }> };

export default async function ModelCardPage({ params }: Props) {
  const { id } = await params;
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href="/" className="text-sm font-medium hover:underline">
          ← Home
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Model card</h1>
      <p className="text-muted-foreground mb-6">
        Purpose, input, output, limitations. Plan §11.9, §946. Data from GET /api/v1/ml/models/:id/card.
      </p>
      <div className="max-w-lg">
        <ModelCard modelId={id} />
      </div>
    </div>
  );
}
