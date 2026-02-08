/**
 * MFA verification — placeholder until auth MFA flows are implemented.
 * Used after login when MFA is required; UI inventory §3.2.
 */

import Link from 'next/link';

export default function MfaVerifyPage() {
  return (
    <div className="p-6">
      <div className="max-w-lg rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h1 className="text-xl font-semibold mb-4">Verify your identity</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          MFA verification is not yet available. When enabled, you will enter a code from your authenticator app here after signing in.
        </p>
        <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-700 underline mr-4">
          Sign in
        </Link>
        <Link href="/settings/security" className="text-sm font-medium text-blue-600 hover:text-blue-700 underline">
          Security settings
        </Link>
      </div>
    </div>
  );
}
