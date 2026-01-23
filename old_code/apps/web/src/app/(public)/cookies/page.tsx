import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CookiePolicyPage() {
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

      <h1 className="mb-4 text-4xl font-bold">Cookie Policy</h1>
      <p className="mb-8 text-lg text-muted-foreground">
        Last updated: November 17, 2025
      </p>

      <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="mb-4 text-2xl font-semibold">What Are Cookies?</h2>
          <p>
            Cookies are small text files that are placed on your computer or mobile device when
            you visit a website. They are widely used to make websites work more efficiently and
            provide information to the owners of the site.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">How We Use Cookies</h2>
          <p>
            Castiel uses cookies to enhance your experience, analyze usage patterns, and
            personalize content. We use different types of cookies for different purposes.
          </p>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Types of Cookies We Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="mb-2 font-semibold">1. Necessary Cookies (Required)</h3>
              <p className="mb-2 text-sm text-muted-foreground">
                These cookies are essential for the website to function properly and cannot be
                disabled.
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm">
                <li>
                  <strong>Authentication tokens:</strong> Keep you logged in securely
                </li>
                <li>
                  <strong>Session management:</strong> Maintain your session state
                </li>
                <li>
                  <strong>Security:</strong> Protect against CSRF and other attacks
                </li>
                <li>
                  <strong>Cookie consent:</strong> Remember your cookie preferences
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">2. Analytics Cookies (Optional)</h3>
              <p className="mb-2 text-sm text-muted-foreground">
                Help us understand how visitors interact with our website by collecting and
                reporting information anonymously.
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm">
                <li>
                  <strong>Azure Application Insights:</strong> Performance monitoring and usage
                  analytics
                </li>
                <li>
                  <strong>Page views:</strong> Track which pages are most visited
                </li>
                <li>
                  <strong>Session duration:</strong> Understand engagement metrics
                </li>
                <li>
                  <strong>Error tracking:</strong> Identify and fix technical issues
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">3. Marketing Cookies (Optional)</h3>
              <p className="mb-2 text-sm text-muted-foreground">
                Used to track visitors across websites to display relevant and engaging
                advertisements.
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm">
                <li>
                  <strong>Advertising partners:</strong> Show relevant ads based on your
                  interests
                </li>
                <li>
                  <strong>Retargeting:</strong> Display ads for products you've viewed
                </li>
                <li>
                  <strong>Campaign tracking:</strong> Measure advertising effectiveness
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Managing Your Cookie Preferences</h2>
          <p className="mb-4">
            You can manage your cookie preferences at any time through our cookie consent banner
            or by visiting your account settings.
          </p>
          <div className="rounded-lg bg-muted p-4">
            <p className="mb-2 font-medium">To change your cookie settings:</p>
            <ol className="list-inside list-decimal space-y-1 text-sm">
              <li>Click on the cookie icon in the footer of any page</li>
              <li>Select your preferences for each cookie category</li>
              <li>Click "Save Preferences" to apply your choices</li>
            </ol>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Browser Controls</h2>
          <p>
            Most web browsers allow you to control cookies through their settings. However,
            limiting cookies may impact your experience on our website. Here's how to manage
            cookies in popular browsers:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site
              data
            </li>
            <li>
              <strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data
            </li>
            <li>
              <strong>Safari:</strong> Preferences → Privacy → Manage Website Data
            </li>
            <li>
              <strong>Edge:</strong> Settings → Cookies and site permissions → Manage and delete
              cookies
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Cookie Retention</h2>
          <p>
            Cookies are stored on your device for varying periods depending on their type and
            purpose:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong>Session cookies:</strong> Deleted when you close your browser
            </li>
            <li>
              <strong>Persistent cookies:</strong> Remain on your device for a set period (up to
              1 year)
            </li>
            <li>
              <strong>Authentication cookies:</strong> Valid for 30 days or until you log out
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Third-Party Cookies</h2>
          <p>
            Some cookies are set by third-party services that appear on our pages. We don't
            control these cookies, and you should check the third-party websites for more
            information about how they use cookies.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Updates to This Policy</h2>
          <p>
            We may update this Cookie Policy from time to time to reflect changes in technology,
            legislation, or our business operations. We will notify you of any significant
            changes by updating the "Last updated" date at the top of this page.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Contact Us</h2>
          <p>
            If you have any questions about our use of cookies, please contact us at:
          </p>
          <div className="mt-4 rounded-lg bg-muted p-4">
            <p className="text-sm">
              <strong>Email:</strong> privacy@castiel.com
              <br />
              <strong>Address:</strong> Castiel Legal Team, [Your Address]
            </p>
          </div>
        </section>

        <div className="mt-8 rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">
            For more information about how we handle your personal data, please see our{" "}
            <Link href="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
