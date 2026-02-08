'use client';

import Link from 'next/link';

export default function MLModelsEndpointNewPage() {
  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin">Admin</Link><span>/</span>
          <Link href="/admin/ml-models">ML Models</Link><span>/</span>
          <Link href="/admin/ml-models/endpoints">Endpoints</Link><span>/</span>
          <span className="text-foreground">New endpoint</span>
        </div>
        <h1 className="text-xl font-semibold mb-4">New endpoint</h1>
        <div className="border rounded-lg p-6 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            Endpoints are configured in ml-service config. Add URLs there and refresh the list.
          </p>
          <Link href="/admin/ml-models/endpoints" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">Back to Endpoints</Link>
        </div>
        <p className="mt-4"><Link href="/admin/ml-models/endpoints" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Endpoints</Link></p>
      </div>
    </div>
  );
}
