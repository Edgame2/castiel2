/**
 * MFA enrollment — placeholder until auth MFA routes (TOTP, backup codes) are implemented.
 * Plan: auth-user-management-gaps.md MFA (P2); UI inventory §3.2.
 */

import Link from 'next/link';

export default function MfaEnrollPage() {
  return (
    <div className="p-6">
      <div className="max-w-lg rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h1 className="text-xl font-semibold mb-4">Set up multi-factor authentication</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          MFA enrollment is not yet available. You will be able to set up an authenticator app (TOTP) and backup codes here once the feature is enabled.
        </p>
        <Link href="/settings/security" className="text-sm font-medium text-blue-600 hover:text-blue-700 underline">
          Back to Security
        </Link>
      </div>
    </div>
  );
}
