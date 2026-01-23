import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PrivacyPage() {
  return (
    <div className="container max-w-4xl py-12">
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to home
        </Link>
      </div>

      <h1 className="mb-4 text-4xl font-bold">Privacy Policy</h1>
      <p className="mb-8 text-lg text-muted-foreground">
        Last updated: November 17, 2025
      </p>

      <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="mb-4 text-2xl font-semibold">Introduction</h2>
          <p>
            Welcome to Castiel. We respect your privacy and are committed to protecting your
            personal data. This privacy policy explains how we collect, use, store, and protect
            your information when you use our enterprise knowledge management platform.
          </p>
          <p>
            This policy applies to all users of the Castiel platform, including organization
            administrators, team members, and super administrators.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">1. Information We Collect</h2>
          
          <h3 className="mb-2 mt-4 text-xl font-semibold">1.1 Information You Provide</h3>
          <p>We collect information that you provide directly to us, including:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong>Account Information:</strong> Name, email address, password, organization
              name
            </li>
            <li>
              <strong>Profile Information:</strong> Job title, department, preferences, timezone
            </li>
            <li>
              <strong>Content Data:</strong> Shards, documents, files, metadata you create or upload
            </li>
            <li>
              <strong>Communication Data:</strong> Messages, support requests, feedback
            </li>
            <li>
              <strong>Billing Information:</strong> Payment details, subscription information
              (processed by third-party payment processors)
            </li>
          </ul>

          <h3 className="mb-2 mt-4 text-xl font-semibold">1.2 Information Automatically Collected</h3>
          <p>When you use our services, we automatically collect:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong>Usage Data:</strong> Pages visited, features used, time spent, click patterns
            </li>
            <li>
              <strong>Device Information:</strong> Browser type, operating system, device type,
              screen resolution
            </li>
            <li>
              <strong>Log Data:</strong> IP address, timestamps, error logs, API calls
            </li>
            <li>
              <strong>Cookies and Tracking:</strong> See our{" "}
              <Link href="/cookies" className="underline hover:text-foreground">
                Cookie Policy
              </Link>{" "}
              for details
            </li>
          </ul>

          <h3 className="mb-2 mt-4 text-xl font-semibold">1.3 Information from Third Parties</h3>
          <p>We may receive information from:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>SSO providers (Azure AD, Okta, etc.) when you authenticate</li>
            <li>Payment processors for subscription management</li>
            <li>Analytics services for usage insights</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">2. How We Use Your Information</h2>
          <p>We use the information we collect for the following purposes:</p>
          
          <h3 className="mb-2 mt-4 text-xl font-semibold">2.1 Service Provision</h3>
          <ul className="list-inside list-disc space-y-1">
            <li>Provide, maintain, and improve the Castiel platform</li>
            <li>Process and complete transactions</li>
            <li>Authenticate users and maintain security</li>
            <li>Enable collaboration features</li>
          </ul>

          <h3 className="mb-2 mt-4 text-xl font-semibold">2.2 Communication</h3>
          <ul className="list-inside list-disc space-y-1">
            <li>Send service announcements and updates</li>
            <li>Respond to support requests and inquiries</li>
            <li>Send administrative notifications</li>
            <li>Provide technical notices and security alerts</li>
          </ul>

          <h3 className="mb-2 mt-4 text-xl font-semibold">2.3 Analytics and Improvements</h3>
          <ul className="list-inside list-disc space-y-1">
            <li>Monitor and analyze usage patterns and trends</li>
            <li>Improve platform performance and user experience</li>
            <li>Detect and prevent technical issues</li>
            <li>Develop new features and services</li>
          </ul>

          <h3 className="mb-2 mt-4 text-xl font-semibold">2.4 Legal Compliance</h3>
          <ul className="list-inside list-disc space-y-1">
            <li>Comply with legal obligations</li>
            <li>Enforce our terms and policies</li>
            <li>Protect against fraud and abuse</li>
            <li>Respond to legal requests</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">3. Legal Basis for Processing (GDPR)</h2>
          <p>
            For users in the European Economic Area (EEA), we process your personal data based on
            the following legal grounds:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong>Contract Performance:</strong> Processing necessary to provide our services
            </li>
            <li>
              <strong>Legitimate Interests:</strong> Improving our services, security, analytics
            </li>
            <li>
              <strong>Legal Compliance:</strong> Meeting regulatory requirements
            </li>
            <li>
              <strong>Consent:</strong> For cookies, marketing communications (where required)
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">4. Data Storage and Security</h2>
          
          <h3 className="mb-2 mt-4 text-xl font-semibold">4.1 Data Storage</h3>
          <p>
            Your data is stored on Microsoft Azure infrastructure in data centers located in the
            European Union and the United States. We implement appropriate regional data residency
            requirements based on your organization's location.
          </p>

          <h3 className="mb-2 mt-4 text-xl font-semibold">4.2 Security Measures</h3>
          <p>
            We implement industry-standard security measures to protect your data:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>Encryption in transit (TLS 1.3) and at rest (AES-256)</li>
            <li>Role-based access control (RBAC)</li>
            <li>Multi-factor authentication (MFA)</li>
            <li>Regular security audits and penetration testing</li>
            <li>Automated backup and disaster recovery</li>
            <li>Security monitoring and incident response</li>
          </ul>

          <h3 className="mb-2 mt-4 text-xl font-semibold">4.3 Data Isolation</h3>
          <p>
            We implement strict multi-tenant data isolation to ensure your organization's data is
            completely separate from other customers.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">5. Data Sharing and Disclosure</h2>
          <p>We do not sell your personal data. We may share your information with:</p>
          
          <h3 className="mb-2 mt-4 text-xl font-semibold">5.1 Service Providers</h3>
          <ul className="list-inside list-disc space-y-1">
            <li>Cloud infrastructure providers (Microsoft Azure)</li>
            <li>Payment processors (for subscription billing)</li>
            <li>Analytics services (with anonymization)</li>
            <li>Customer support tools</li>
          </ul>

          <h3 className="mb-2 mt-4 text-xl font-semibold">5.2 Business Transfers</h3>
          <p>
            In the event of a merger, acquisition, or sale of assets, your information may be
            transferred to the acquiring entity.
          </p>

          <h3 className="mb-2 mt-4 text-xl font-semibold">5.3 Legal Requirements</h3>
          <p>
            We may disclose your information if required by law, court order, or government
            request.
          </p>
        </section>

        <Card className="my-8">
          <CardHeader>
            <CardTitle>Your Rights Under GDPR</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="mb-1 font-semibold">Right to Access (Article 15)</h4>
              <p className="text-sm text-muted-foreground">
                You can request a copy of your personal data at any time through our{" "}
                <Link href="/settings/data-export" className="underline hover:text-foreground">
                  Data Export
                </Link>{" "}
                tool.
              </p>
            </div>
            <div>
              <h4 className="mb-1 font-semibold">Right to Rectification (Article 16)</h4>
              <p className="text-sm text-muted-foreground">
                You can update your profile and account information at any time in your settings.
              </p>
            </div>
            <div>
              <h4 className="mb-1 font-semibold">Right to Erasure (Article 17)</h4>
              <p className="text-sm text-muted-foreground">
                You can request deletion of your account and all data through our{" "}
                <Link href="/settings/data-deletion" className="underline hover:text-foreground">
                  Account Deletion
                </Link>{" "}
                page.
              </p>
            </div>
            <div>
              <h4 className="mb-1 font-semibold">Right to Portability (Article 20)</h4>
              <p className="text-sm text-muted-foreground">
                You can export your data in JSON format for transfer to another service.
              </p>
            </div>
            <div>
              <h4 className="mb-1 font-semibold">Right to Object (Article 21)</h4>
              <p className="text-sm text-muted-foreground">
                You can object to certain types of processing, including marketing communications.
              </p>
            </div>
            <div>
              <h4 className="mb-1 font-semibold">Right to Restriction (Article 18)</h4>
              <p className="text-sm text-muted-foreground">
                You can request restriction of processing under certain circumstances.
              </p>
            </div>
          </CardContent>
        </Card>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">6. Data Retention</h2>
          <p>
            We retain your personal data for as long as necessary to provide our services and
            comply with legal obligations:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong>Active Accounts:</strong> Data retained while your account is active
            </li>
            <li>
              <strong>Deleted Accounts:</strong> Most data deleted within 30 days, with backups
              purged within 90 days
            </li>
            <li>
              <strong>Legal Requirements:</strong> Some data may be retained longer for compliance
              (e.g., billing records for 7 years)
            </li>
            <li>
              <strong>Audit Logs:</strong> Retained for 2 years for security and compliance
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">7. International Data Transfers</h2>
          <p>
            Your data may be transferred to and processed in countries outside your country of
            residence. We ensure appropriate safeguards are in place:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>Standard Contractual Clauses (SCCs) for EU data transfers</li>
            <li>Data Processing Agreements with all subprocessors</li>
            <li>Compliance with Privacy Shield principles (where applicable)</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">8. Children's Privacy</h2>
          <p>
            Castiel is not intended for use by individuals under the age of 16. We do not knowingly
            collect personal information from children. If you believe we have collected
            information from a child, please contact us immediately.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">9. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of any
            significant changes by:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>Posting the new policy on this page</li>
            <li>Updating the "Last updated" date</li>
            <li>Sending an email notification for material changes</li>
            <li>Displaying an in-app notification</li>
          </ul>
          <p>
            Your continued use of our services after changes indicates your acceptance of the
            updated policy.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">10. Contact Us</h2>
          <p>
            If you have questions about this privacy policy or our data practices, please contact
            us:
          </p>
          <div className="mt-4 rounded-lg bg-muted p-4">
            <p className="text-sm">
              <strong>Data Protection Officer:</strong> privacy@castiel.com
              <br />
              <strong>Email:</strong> support@castiel.com
              <br />
              <strong>Address:</strong> Castiel Legal Team, [Your Company Address]
              <br />
              <strong>EU Representative:</strong> [EU Representative Details if applicable]
            </p>
          </div>
        </section>

        <div className="mt-8 rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">
            For information about cookies, see our{" "}
            <Link href="/cookies" className="underline hover:text-foreground">
              Cookie Policy
            </Link>
            . For terms of service, see our{" "}
            <Link href="/terms" className="underline hover:text-foreground">
              Terms of Service
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
