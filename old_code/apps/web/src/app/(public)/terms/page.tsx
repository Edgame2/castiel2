import Link from "next/link"

export default function TermsPage() {
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

      <h1 className="mb-4 text-4xl font-bold">Terms of Service</h1>
      <p className="mb-8 text-lg text-muted-foreground">
        Last updated: November 17, 2025
      </p>

      <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="mb-4 text-2xl font-semibold">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Castiel platform ("Service"), you agree to be bound by these
            Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
          </p>
          <p>
            These Terms constitute a legally binding agreement between you (either as an individual
            or on behalf of an entity) and Castiel regarding your use of the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">2. Description of Service</h2>
          <p>
            Castiel is an enterprise B2B SaaS platform for intelligent knowledge management and data
            organization. The Service allows you to:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>Create, store, and manage structured and unstructured data (Shards)</li>
            <li>Define custom data schemas (Shard Types)</li>
            <li>Collaborate with team members within your organization</li>
            <li>Integrate with external services via APIs</li>
            <li>Search and analyze your data using AI-powered features</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">3. Account Registration</h2>
          <h3 className="mb-2 mt-4 text-xl font-semibold">3.1 Account Creation</h3>
          <p>To use the Service, you must:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Provide accurate and complete registration information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Be at least 16 years of age</li>
            <li>Have the authority to bind your organization to these Terms</li>
          </ul>

          <h3 className="mb-2 mt-4 text-xl font-semibold">3.2 Account Responsibility</h3>
          <p>
            You are responsible for all activities that occur under your account. You must
            immediately notify us of any unauthorized access or security breach.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">4. Acceptable Use</h2>
          <h3 className="mb-2 mt-4 text-xl font-semibold">4.1 Permitted Use</h3>
          <p>You may use the Service only for lawful purposes and in accordance with these Terms.</p>

          <h3 className="mb-2 mt-4 text-xl font-semibold">4.2 Prohibited Activities</h3>
          <p>You agree not to:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Violate any applicable laws or regulations</li>
            <li>Infringe upon intellectual property rights of others</li>
            <li>Upload malicious code, viruses, or harmful content</li>
            <li>Attempt to gain unauthorized access to the Service or related systems</li>
            <li>Interfere with or disrupt the Service or servers</li>
            <li>Use the Service to transmit spam or unsolicited communications</li>
            <li>Impersonate any person or entity</li>
            <li>Collect or harvest data from other users without consent</li>
            <li>Use automated systems to access the Service without authorization</li>
            <li>Reverse engineer, decompile, or disassemble the Service</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">5. Intellectual Property</h2>
          <h3 className="mb-2 mt-4 text-xl font-semibold">5.1 Our IP Rights</h3>
          <p>
            The Service and its original content, features, and functionality are owned by Castiel
            and are protected by international copyright, trademark, patent, trade secret, and other
            intellectual property laws.
          </p>

          <h3 className="mb-2 mt-4 text-xl font-semibold">5.2 Your Content</h3>
          <p>
            You retain all rights to the content you upload to the Service ("Your Content"). By
            uploading Your Content, you grant us a limited license to:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>Store, process, and transmit Your Content to provide the Service</li>
            <li>Perform backups and disaster recovery</li>
            <li>Generate anonymized analytics and insights</li>
          </ul>
          <p>
            This license terminates when you delete Your Content or close your account, subject to
            reasonable backup retention periods.
          </p>

          <h3 className="mb-2 mt-4 text-xl font-semibold">5.3 Content Responsibility</h3>
          <p>
            You are solely responsible for Your Content and the consequences of posting or
            publishing it. You represent and warrant that:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>You own or have the necessary rights to Your Content</li>
            <li>Your Content does not violate any laws or these Terms</li>
            <li>Your Content does not infringe upon any third-party rights</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">6. Subscription and Payment</h2>
          <h3 className="mb-2 mt-4 text-xl font-semibold">6.1 Subscription Plans</h3>
          <p>
            The Service is offered through various subscription plans with different features and
            pricing. Current plans and pricing are available on our website.
          </p>

          <h3 className="mb-2 mt-4 text-xl font-semibold">6.2 Billing</h3>
          <ul className="list-inside list-disc space-y-1">
            <li>Subscriptions are billed in advance on a monthly or annual basis</li>
            <li>Payment is due upon subscription or renewal</li>
            <li>All fees are non-refundable except as required by law</li>
            <li>Prices may change with 30 days' notice</li>
          </ul>

          <h3 className="mb-2 mt-4 text-xl font-semibold">6.3 Free Trial</h3>
          <p>
            We may offer a free trial period. At the end of the trial, your subscription will
            automatically convert to a paid subscription unless you cancel before the trial ends.
          </p>

          <h3 className="mb-2 mt-4 text-xl font-semibold">6.4 Cancellation</h3>
          <p>
            You may cancel your subscription at any time. Cancellation takes effect at the end of
            your current billing period. No refunds are provided for partial periods.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">7. Data and Privacy</h2>
          <p>
            Our collection, use, and protection of your personal data is described in our{" "}
            <Link href="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </Link>
            . By using the Service, you agree to our Privacy Policy.
          </p>

          <h3 className="mb-2 mt-4 text-xl font-semibold">7.1 Data Processing</h3>
          <p>
            We process your data as a Data Processor under GDPR. You (or your organization) are the
            Data Controller. We will:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>Process data only as instructed by you</li>
            <li>Implement appropriate technical and organizational measures</li>
            <li>Assist with your GDPR compliance obligations</li>
            <li>Delete or return data upon request</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">8. Service Availability</h2>
          <h3 className="mb-2 mt-4 text-xl font-semibold">8.1 Uptime</h3>
          <p>
            We strive to maintain 99.9% uptime for the Service, excluding scheduled maintenance and
            force majeure events. Our Service Level Agreement (SLA) is available separately for
            enterprise customers.
          </p>

          <h3 className="mb-2 mt-4 text-xl font-semibold">8.2 Maintenance</h3>
          <p>
            We may perform scheduled maintenance with advance notice. Emergency maintenance may
            occur without notice.
          </p>

          <h3 className="mb-2 mt-4 text-xl font-semibold">8.3 Service Modifications</h3>
          <p>
            We reserve the right to modify, suspend, or discontinue any part of the Service with or
            without notice. We are not liable for any modification, suspension, or discontinuance.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">9. Warranties and Disclaimers</h2>
          <h3 className="mb-2 mt-4 text-xl font-semibold">9.1 Service Provided "As Is"</h3>
          <p>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
            WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY,
            FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
          </p>

          <h3 className="mb-2 mt-4 text-xl font-semibold">9.2 No Guarantee</h3>
          <p>
            We do not guarantee that the Service will be uninterrupted, error-free, secure, or free
            from viruses or other harmful components.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">10. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, CASTIEL SHALL NOT BE LIABLE FOR ANY INDIRECT,
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR
            REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL,
            OR OTHER INTANGIBLE LOSSES.
          </p>
          <p>
            OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE 12 MONTHS
            PRECEDING THE CLAIM.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">11. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Castiel, its affiliates, and their respective
            officers, directors, employees, and agents from any claims, damages, losses, liabilities,
            costs, and expenses (including reasonable attorneys' fees) arising out of or relating to:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>Your use of the Service</li>
            <li>Your Content</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any third-party rights</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">12. Termination</h2>
          <h3 className="mb-2 mt-4 text-xl font-semibold">12.1 Termination by You</h3>
          <p>
            You may terminate your account at any time through your account settings or by
            contacting us.
          </p>

          <h3 className="mb-2 mt-4 text-xl font-semibold">12.2 Termination by Us</h3>
          <p>We may suspend or terminate your access to the Service if:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>You violate these Terms</li>
            <li>You fail to pay applicable fees</li>
            <li>Your use poses a security risk or legal liability</li>
            <li>We cease offering the Service</li>
          </ul>

          <h3 className="mb-2 mt-4 text-xl font-semibold">12.3 Effect of Termination</h3>
          <p>
            Upon termination, your right to use the Service ceases immediately. We will delete Your
            Content within 30 days, except where retention is required by law.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">13. Governing Law</h2>
          <p>
            These Terms are governed by the laws of [Your Jurisdiction], without regard to conflict
            of law principles. Any disputes shall be resolved in the courts of [Your Jurisdiction].
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">14. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. We will notify you of material changes by:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>Posting the updated Terms on this page</li>
            <li>Updating the "Last updated" date</li>
            <li>Sending an email notification</li>
          </ul>
          <p>
            Your continued use of the Service after changes constitutes acceptance of the updated
            Terms.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">15. Contact Information</h2>
          <p>
            For questions about these Terms, please contact us:
          </p>
          <div className="mt-4 rounded-lg bg-muted p-4">
            <p className="text-sm">
              <strong>Email:</strong> legal@castiel.com
              <br />
              <strong>Support:</strong> support@castiel.com
              <br />
              <strong>Address:</strong> Castiel Legal Team, [Your Company Address]
            </p>
          </div>
        </section>

        <div className="mt-8 rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">
            Related Policies:{" "}
            <Link href="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </Link>
            {" | "}
            <Link href="/cookies" className="underline hover:text-foreground">
              Cookie Policy
            </Link>
            {" | "}
            <Link href="/accessibility" className="underline hover:text-foreground">
              Accessibility Statement
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
