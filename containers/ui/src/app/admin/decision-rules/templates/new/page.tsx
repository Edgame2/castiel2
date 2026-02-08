'use client';

import Link from 'next/link';

export default function DecisionRuleTemplateNewPage() {
  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin">Admin</Link><span>/</span>
          <Link href="/admin/decision-rules">Decision Rules</Link><span>/</span>
          <Link href="/admin/decision-rules/templates">Templates</Link><span>/</span>
          <span className="text-foreground">New template</span>
        </div>
        <h1 className="text-xl font-semibold mb-4">New template</h1>
        <div className="border rounded-lg p-6 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            Custom templates are not yet supported. The API returns a read-only list. Create a rule from the Rules page.
          </p>
          <div className="flex gap-2">
            <Link href="/admin/decision-rules/rules/new" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">Create rule</Link>
            <Link href="/admin/decision-rules/templates" className="px-4 py-2 border rounded dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm">Back to Templates</Link>
          </div>
        </div>
        <p className="mt-4"><Link href="/admin/decision-rules/templates" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Templates</Link></p>
      </div>
    </div>
  );
}
